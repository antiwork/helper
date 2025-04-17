import { currentUser } from "@clerk/nextjs/server";
import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, files, platformCustomers } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { createConversationEmbedding, PromptTooLongError } from "@/lib/ai/conversationEmbedding";
import { generateDraftResponse } from "@/lib/ai/generateResponse";
import { serializeConversation, serializeConversationWithMessages, updateConversation } from "@/lib/data/conversation";
import { countSearchResults, searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import {
  createAiDraft,
  createReply,
  getLastAiGeneratedDraft,
  serializeResponseAiDraft,
} from "@/lib/data/conversationMessage";
import { getGmailSupportEmail } from "@/lib/data/gmailSupportEmail";
import { getOrganizationMembers } from "@/lib/data/organization";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { mailboxProcedure } from "../procedure";
import { filesRouter } from "./files";
import { githubRouter } from "./github";
import { messagesRouter } from "./messages";
import { notesRouter } from "./notes";
import { conversationProcedure } from "./procedure";
import { toolsRouter } from "./tools";

export { conversationProcedure };

export const conversationsRouter = {
  list: mailboxProcedure.input(searchSchema).query(async ({ input, ctx }) => {
    const { list, where, metadataEnabled } = await searchConversations(ctx.mailbox, input, ctx.session.userId);

    const [{ results, nextCursor }, total] = await Promise.all([list, countSearchResults(where)]);

    return {
      conversations: results,
      total,
      defaultSort: metadataEnabled ? ("highest_value" as const) : ("oldest" as const),
      hasGmailSupportEmail: !!(await getGmailSupportEmail(ctx.mailbox)),
      assignedToClerkIds: input.assignee ?? null,
      nextCursor,
    };
  }),

  listWithPreview: mailboxProcedure.input(searchSchema).query(async ({ input, ctx }) => {
    const { list } = await searchConversations(ctx.mailbox, input, ctx.session.userId);
    const { results, nextCursor } = await list;

    const messages = await db
      .select({
        role: conversationMessages.role,
        cleanedUpText: conversationMessages.cleanedUpText,
        conversationId: conversationMessages.conversationId,
        createdAt: conversationMessages.createdAt,
      })
      .from(conversationMessages)
      .where(
        inArray(
          conversationMessages.conversationId,
          results.map((c) => c.id),
        ),
      )
      .orderBy(desc(conversationMessages.createdAt));

    return {
      conversations: results.map((conversation) => {
        const lastUserMessage = messages.find((m) => m.role === "user" && m.conversationId === conversation.id);
        const lastStaffMessage = messages.find((m) => m.role === "staff" && m.conversationId === conversation.id);

        return {
          ...conversation,
          userMessageText: lastUserMessage?.cleanedUpText ?? null,
          staffMessageText:
            lastStaffMessage && lastUserMessage && lastStaffMessage.createdAt > lastUserMessage.createdAt
              ? lastStaffMessage.cleanedUpText
              : null,
        };
      }),
      nextCursor,
    };
  }),

  bySlug: mailboxProcedure.input(z.object({ slugs: z.array(z.string()) })).query(async ({ input, ctx }) => {
    const list = await db.query.conversations.findMany({
      where: and(eq(conversations.mailboxId, ctx.mailbox.id), inArray(conversations.slug, input.slugs)),
    });
    return await Promise.all(list.map((c) => serializeConversationWithMessages(ctx.mailbox, c)));
  }),
  get: conversationProcedure.query(async ({ ctx }) => {
    const conversation = ctx.conversation;
    const draft = await getLastAiGeneratedDraft(conversation.id);
    const user = assertDefined(await currentUser());

    return {
      ...(await serializeConversationWithMessages(ctx.mailbox, ctx.conversation)),
      draft: draft ? serializeResponseAiDraft(draft, ctx.mailbox) : null,
    };
  }),
  create: mailboxProcedure
    .input(
      z.object({
        conversation: z.object({
          to_email_address: z.string().email(),
          subject: z.string(),
          cc: z.array(z.string().email()),
          bcc: z.array(z.string().email()),
          message: z.string().optional(),
          file_slugs: z.array(z.string()),
          conversation_slug: z.string(),
        }),
      }),
    )
    .mutation(async ({ input: { conversation }, ctx }) => {
      const { id: conversationId } = await db
        .insert(conversations)
        .values({
          mailboxId: ctx.mailbox.id,
          slug: conversation.conversation_slug,
          subject: conversation.subject,
          emailFrom: conversation.to_email_address,
          conversationProvider: "gmail",
        })
        .returning({ id: conversations.id })
        .then(takeUniqueOrThrow);

      await createReply({
        conversationId,
        user: assertDefined(await currentUser()),
        message: conversation.message?.trim() || null,
        fileSlugs: conversation.file_slugs,
        cc: conversation.cc,
        bcc: conversation.bcc,
      });
    }),
  update: conversationProcedure
    .input(
      z.object({
        status: z.enum(["open", "closed", "spam"]).optional(),
        assignedToId: z.string().nullable().optional(),
        message: z.string().nullable().optional(),
        assignedToAI: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.assignedToId) {
        const members = await getOrganizationMembers(ctx.session.orgId);
        if (!members.data.some((m) => m.publicUserData?.userId === input.assignedToId)) {
          throw new TRPCError({ code: "BAD_REQUEST" });
        }
      }

      await updateConversation(ctx.conversation.id, {
        set: {
          status: input.status,
          assignedToClerkId: input.assignedToId,
          assignedToAI: input.assignedToAI,
        },
        byUserId: ctx.session.userId,
        message: input.message ?? null,
      });
    }),
  bulkUpdate: mailboxProcedure
    .input(
      z.object({
        conversationFilter: z.union([z.array(z.number()), searchSchema]),
        status: z.enum(["open", "closed", "spam"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { conversationFilter, status } = input;

      if (Array.isArray(conversationFilter) && conversationFilter.length < 25) {
        for (const conversationId of conversationFilter) {
          await updateConversation(conversationId, { set: { status }, byUserId: ctx.session.userId });
        }
        return { updatedImmediately: true };
      }

      await inngest.send({
        name: "conversations/bulk-update",
        data: {
          mailboxId: ctx.mailbox.id,
          userId: ctx.session.userId,
          conversationFilter: input.conversationFilter,
          status: input.status,
        },
      });
      return { updatedImmediately: false };
    }),
  refreshDraft: conversationProcedure.mutation(async ({ ctx }) => {
    const lastUserMessage = await db.query.conversationMessages.findFirst({
      where: and(eq(conversationMessages.conversationId, ctx.conversation.id), eq(conversationMessages.role, "user")),
      orderBy: desc(conversationMessages.createdAt),
      with: {
        conversation: {
          columns: {
            subject: true,
          },
        },
      },
    });
    if (!lastUserMessage) throw new TRPCError({ code: "NOT_FOUND", message: "No user message found" });
    const metadata: object = lastUserMessage?.metadata ?? {};

    const oldDraft = await getLastAiGeneratedDraft(ctx.conversation.id);
    const { draftResponse, promptInfo } = await generateDraftResponse(ctx.mailbox.id, lastUserMessage, metadata);

    const newDraft = await db.transaction(async (tx) => {
      if (oldDraft) {
        await tx
          .update(conversationMessages)
          .set({ status: "discarded" })
          .where(eq(conversationMessages.id, oldDraft.id));
      }
      return await createAiDraft(ctx.conversation.id, draftResponse, lastUserMessage.id, promptInfo, tx);
    });

    return serializeResponseAiDraft(newDraft, ctx.mailbox);
  }),
  undo: conversationProcedure.input(z.object({ emailId: z.number() })).mutation(async ({ ctx, input }) => {
    const email = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.id, input.emailId),
        eq(conversationMessages.conversationId, ctx.conversation.id),
        isNull(conversationMessages.deletedAt),
        eq(conversationMessages.status, "queueing"),
      ),
    });
    if (!email) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Email not found",
      });
    }

    await db.transaction(async (tx) => {
      await Promise.all([
        tx.update(conversationMessages).set({ deletedAt: new Date() }).where(eq(conversationMessages.id, email.id)),
        tx.update(conversations).set({ status: "open" }).where(eq(conversations.id, ctx.conversation.id)),
        tx.update(files).set({ messageId: null }).where(eq(files.messageId, email.id)),
      ]);
    });
  }),
  splitMerged: mailboxProcedure.input(z.object({ messageId: z.number() })).mutation(async ({ ctx, input }) => {
    const message = await db.query.conversationMessages.findFirst({
      where: and(eq(conversationMessages.id, input.messageId)),
      with: {
        conversation: true,
      },
    });
    if (!message || message.conversation.mailboxId !== ctx.mailbox.id || !message.conversation.mergedIntoId) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
    }
    const conversation = await db
      .update(conversations)
      .set({ mergedIntoId: null, status: "open" })
      .where(eq(conversations.id, message.conversation.id))
      .returning()
      .then(takeUniqueOrThrow);
    return serializeConversation(ctx.mailbox, conversation, null);
  }),
  messages: messagesRouter,
  files: filesRouter,
  tools: toolsRouter,
  notes: notesRouter,
  github: githubRouter,

  findSimilar: conversationProcedure.query(async ({ ctx }) => {
    let conversation = ctx.conversation;
    if (!conversation.embeddingText) {
      try {
        conversation = await createConversationEmbedding(conversation.id);
      } catch (e) {
        if (e instanceof PromptTooLongError) return null;
        throw e;
      }
    }

    const similarConversations = await findSimilarConversations(
      assertDefined(conversation.embeddingText),
      ctx.mailbox,
      5,
      conversation.slug,
    );

    return {
      conversations: await Promise.all(
        similarConversations?.map((c) => serializeConversation(ctx.mailbox, c, null)) ?? [],
      ),
      similarityMap: similarConversations?.reduce(
        (acc, c) => {
          acc[c.slug] = c.similarity;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }),
  alertCounts: mailboxProcedure.query(async ({ ctx }) => {
    const now = new Date();

    const [conversation, assignedToMe, vipOverdue] = await Promise.all([
      db.query.conversations.findFirst({
        columns: { id: true },
        where: and(eq(conversations.mailboxId, ctx.mailbox.id)),
      }),
      db.$count(
        conversations,
        and(
          eq(conversations.mailboxId, ctx.mailbox.id),
          eq(conversations.assignedToClerkId, ctx.session.userId),
          eq(conversations.status, "open"),
        ),
      ),
      ctx.mailbox.vipThreshold && ctx.mailbox.vipExpectedResponseHours
        ? db
            .select({ count: count() })
            .from(conversations)
            .leftJoin(
              platformCustomers,
              and(
                eq(conversations.mailboxId, platformCustomers.mailboxId),
                eq(conversations.emailFrom, platformCustomers.email),
              ),
            )
            .where(
              and(
                eq(conversations.mailboxId, ctx.mailbox.id),
                eq(conversations.status, "open"),
                lt(
                  conversations.lastUserEmailCreatedAt,
                  new Date(now.getTime() - ctx.mailbox.vipExpectedResponseHours * 60 * 60 * 1000),
                ),
                sql`${platformCustomers.value} >= ${ctx.mailbox.vipThreshold * 100}`,
              ),
            )
        : [],
    ]);

    return {
      hasConversations: !!conversation,
      assignedToMe,
      vipOverdue: vipOverdue[0]?.count ?? 0,
      vipExpectedResponseHours: ctx.mailbox.vipExpectedResponseHours,
    };
  }),
} satisfies TRPCRouterRecord;

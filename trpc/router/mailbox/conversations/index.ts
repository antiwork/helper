import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, count, desc, eq, inArray, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, files, platformCustomers } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { generateDraftResponse } from "@/lib/ai/chat";
import { createConversationEmbedding, PromptTooLongError } from "@/lib/ai/conversationEmbedding";
import { serializeConversation, serializeConversationWithMessages, updateConversation } from "@/lib/data/conversation";
import { countSearchResults, searchConversations } from "@/lib/data/conversation/search";
import { searchSchema } from "@/lib/data/conversation/searchSchema";
import { createReply, getLastAiGeneratedDraft, serializeResponseAiDraft } from "@/lib/data/conversationMessage";
import { getGmailSupportEmail } from "@/lib/data/gmailSupportEmail";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { env } from "@/lib/env";
import { mailboxProcedure } from "../procedure";
import { filesRouter } from "./files";
import { githubRouter } from "./github";
import { messagesRouter } from "./messages";
import { notesRouter } from "./notes";
import { conversationProcedure } from "./procedure";
import { toolsRouter } from "./tools";

export const conversationsRouter = {
  list: mailboxProcedure.input(searchSchema).query(async ({ input, ctx }) => {
    const { list, metadataEnabled } = await searchConversations(ctx.mailbox, input, ctx.user.id);

    const { results, nextCursor } = await list;

    return {
      conversations: results,
      defaultSort: metadataEnabled ? ("highest_value" as const) : ("newest" as const),
      onboardingState: {
        hasResend: !!(env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS),
        hasWidgetHost: !!ctx.mailbox.chatIntegrationUsed,
        hasGmailSupportEmail: !!(await getGmailSupportEmail(ctx.mailbox)),
      },
      assignedToIds: input.assignee ?? null,
      nextCursor,
    };
  }),

  count: mailboxProcedure.input(searchSchema).query(async ({ input, ctx }) => {
    const { where } = await searchConversations(ctx.mailbox, input, ctx.user.id);
    const total = await countSearchResults(where);
    return { total };
  }),

  listWithPreview: mailboxProcedure.input(searchSchema).query(async ({ input, ctx }) => {
    const { list } = await searchConversations(ctx.mailbox, input, ctx.user.id);
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
        user: ctx.user,
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
        const assignee = await db.query.authUsers.findFirst({
          where: eq(authUsers.id, input.assignedToId),
        });
        if (!assignee) throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await updateConversation(ctx.conversation.id, {
        set: {
          status: input.status,
          assignedToId: input.assignedToId,
          assignedToAI: input.assignedToAI,
        },
        byUserId: ctx.user.id,
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

      if (Array.isArray(conversationFilter)) {
        for (const conversationId of conversationFilter) {
          await updateConversation(conversationId, { set: { status }, byUserId: ctx.user.id });
        }
        return { updatedImmediately: true };
      }
      // Handle search criteria by finding matching conversations
      const { where } = await searchConversations(ctx.mailbox, conversationFilter, ctx.user.id);
      const results = await db
        .select({ id: conversations.id })
        .from(conversations)
        .leftJoin(
          platformCustomers,
          and(
            eq(conversations.mailboxId, platformCustomers.mailboxId),
            eq(conversations.emailFrom, platformCustomers.email),
          ),
        )
        .where(and(...Object.values(where)));

      for (const conversation of results) {
        await updateConversation(conversation.id, { set: { status }, byUserId: ctx.user.id });
      }
      return { updatedImmediately: true };
    }),
  bulkAssign: mailboxProcedure
    .input(
      z.object({
        conversationFilter: z.union([z.array(z.number()), searchSchema]),
        assignedToId: z.string().nullable(),
        assignedToAI: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const { conversationFilter, assignedToId, assignedToAI } = input;

      if (assignedToId) {
        const assignee = await db.query.authUsers.findFirst({
          where: eq(authUsers.id, assignedToId),
        });
        if (!assignee) throw new TRPCError({ code: "BAD_REQUEST" });
      }

      if (Array.isArray(conversationFilter)) {
        for (const conversationId of conversationFilter) {
          await updateConversation(conversationId, {
            set: { assignedToId, assignedToAI },
            byUserId: ctx.user.id,
          });
        }
        return { updatedImmediately: true };
      }
      // Handle search criteria by finding matching conversations
      const { where } = await searchConversations(ctx.mailbox, conversationFilter, ctx.user.id);
      const results = await db
        .select({ id: conversations.id })
        .from(conversations)
        .leftJoin(
          platformCustomers,
          and(
            eq(conversations.mailboxId, platformCustomers.mailboxId),
            eq(conversations.emailFrom, platformCustomers.email),
          ),
        )
        .where(and(...Object.values(where)));

      for (const conversation of results) {
        await updateConversation(conversation.id, {
          set: { assignedToId, assignedToAI },
          byUserId: ctx.user.id,
        });
      }
      return { updatedImmediately: true };
    }),
  generateDraft: conversationProcedure.mutation(async ({ ctx }) => {
    const newDraft = await generateDraftResponse(ctx.conversation.id, ctx.mailbox);
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
          eq(conversations.assignedToId, ctx.user.id),
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

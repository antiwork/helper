import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { MatchingConversation } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/automaticWorkflowsSetting";
import { db } from "@/db/client";
import { conversationMessages, conversations, workflows } from "@/db/schema";
import {
  getLastUserMessage,
  getMatchingConversationsByPrompt,
  getRelatedConversations,
  MAX_RELATED_CONVERSATIONS_COUNT,
} from "@/lib/data/conversation";
import {
  executeWorkflowActions,
  getWorkflowAction,
  getWorkflowPrompt,
  serializeFreeformWorkflow,
  updateOrCreateFreeformWorkflow,
} from "@/lib/data/workflow";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { generateWorkflowPrompt } from "@/lib/workflowPromptGenerator";
import { WorkflowActions } from "@/types/workflows";
import { conversationProcedure } from "./conversations/procedure";
import { mailboxProcedure } from "./procedure";

const EditableWorkflowSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  prompt: z.string(),
  action: z.nativeEnum(WorkflowActions),
  order: z.number(),
  runOnReplies: z.boolean(),
  autoReplyFromMetadata: z.boolean(),
  message: z.nullable(z.string()).optional(),
  slackChannelId: z.nullable(z.string()).optional(),
  assignedUserId: z.nullable(z.string()).optional(),
});

export const workflowsRouter = {
  list: mailboxProcedure.query(async ({ ctx }) => {
    const items = await db.query.workflows.findMany({
      where: and(eq(workflows.mailboxId, ctx.mailbox.id), isNull(workflows.deletedAt)),
      with: {
        workflowActions: true,
        groups: {
          with: {
            conds: true,
          },
        },
      },
      orderBy: workflows.order,
    });
    return items.map((item) => ({
      ...item,
      prompt: getWorkflowPrompt(item),
      ...getWorkflowAction(item.workflowActions),
    }));
  }),
  set: mailboxProcedure.input(EditableWorkflowSchema).mutation(async ({ input, ctx }) => {
    const result = await updateOrCreateFreeformWorkflow({ ...input, mailboxId: ctx.mailbox.id });
    if (result.error) throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
  }),
  delete: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ input, ctx }) => {
    const updated = await db
      .update(workflows)
      .set({ deletedAt: new Date() })
      .where(and(eq(workflows.mailboxId, ctx.mailbox.id), eq(workflows.id, input.id), isNull(workflows.deletedAt)))
      .returning();
    if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
  }),
  reorder: mailboxProcedure.input(z.object({ positions: z.array(z.number()) })).mutation(async ({ input, ctx }) => {
    await db.transaction(async (tx) => {
      await Promise.all(
        input.positions.map((id, order) =>
          tx
            .update(workflows)
            .set({ order })
            .where(and(eq(workflows.mailboxId, ctx.mailbox.id), eq(workflows.id, id))),
        ),
      );
    });
  }),
  listMatchingConversations: conversationProcedure
    .input(
      z.object({
        prompt: z.string().min(1, { message: "Prompt is required" }),
        mailboxSlug: z.string(),
        conversationSlug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const relatedConversations = await getRelatedConversations(ctx.conversation.id, {
        where: eq(conversations.status, "open"),
        whereMessages: eq(conversationMessages.role, "user"),
      });
      const matchingConversations = await getMatchingConversationsByPrompt(relatedConversations, input.prompt);

      const result: MatchingConversation[] = matchingConversations.map((conversation) => ({
        subject: conversation.subject ?? "(no subject)",
        slug: conversation.slug,
        email_from: conversation.emailFrom ?? "",
      }));
      return { conversations: result };
    }),
  generateWorkflowPrompt: conversationProcedure
    .input(
      z.object({
        mailboxSlug: z.string(),
        conversationSlug: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { conversation } = ctx;
      const lastUserEmail = await getLastUserMessage(conversation.id);
      if (!lastUserEmail) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User email not found" });
      }
      const prompt = await generateWorkflowPrompt(conversation, lastUserEmail, ctx.mailbox);
      return { prompt };
    }),
  answerWithWorkflow: conversationProcedure
    .input(
      z.object({
        mailboxSlug: z.string(),
        conversationSlug: z.string(),
        workflow: EditableWorkflowSchema,
        matchingSlugs: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { conversation } = ctx;
      const { workflow, matchingSlugs } = input;

      if (matchingSlugs.length > MAX_RELATED_CONVERSATIONS_COUNT) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Maximum conversation count exceeded" });
      }

      const { error: workflowError } = serializeFreeformWorkflow(workflow);
      if (workflowError) {
        throw new TRPCError({ code: "BAD_REQUEST", message: workflowError });
      }

      const workflowData = await updateOrCreateFreeformWorkflow({ ...workflow, mailboxId: ctx.mailbox.id });
      if ("error" in workflowData) {
        throw new TRPCError({ code: "BAD_REQUEST", message: workflowData.error });
      }

      const conversationsBySlugs = await db.query.conversations.findMany({
        where: and(eq(conversations.mailboxId, ctx.mailbox.id), inArray(conversations.slug, matchingSlugs)),
      });

      for (const { id: conversationId } of [conversation, ...conversationsBySlugs]) {
        const lastUserMessage = await getLastUserMessage(conversationId);
        if (!lastUserMessage) {
          captureExceptionAndThrowIfDevelopment(
            `Cannot answer conversation ${conversation.slug} with workflow: Last user message does not exist`,
          );
          continue;
        }
        try {
          await executeWorkflowActions(workflowData.workflow, lastUserMessage);
        } catch (e) {
          captureExceptionAndThrowIfDevelopment(e);
        }
      }
    }),
} satisfies TRPCRouterRecord;

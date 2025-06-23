import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationMessages, faqs } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { runAIObjectQuery } from "@/lib/ai";
import { approveSuggestedEdit, rejectSuggestedEdit } from "@/lib/data/knowledge";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { findEnabledKnowledgeBankEntries } from "@/lib/data/retrieval";
import { mailboxProcedure } from "./procedure";

const suggestionResponseSchema = z.object({
  action: z.enum(["no_action", "create_entry"]),
  reason: z.string(),
  content: z.string().optional(),
});

export const faqsRouter = {
  list: mailboxProcedure.query(async ({ ctx }) => {
    return await db
      .select({
        id: faqs.id,
        content: faqs.content,
        enabled: faqs.enabled,
        suggested: faqs.suggested,
        suggestedReplacementForId: faqs.suggestedReplacementForId,
        mailboxId: faqs.mailboxId,
        createdAt: faqs.createdAt,
        updatedAt: faqs.updatedAt,
      })
      .from(faqs)
      .where(eq(faqs.mailboxId, ctx.mailbox.id))
      .orderBy(asc(faqs.content));
  }),
  create: mailboxProcedure
    .input(
      z.object({
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        const faq = await tx
          .insert(faqs)
          .values({ mailboxId: ctx.mailbox.id, content: input.content })
          .returning()
          .then(takeUniqueOrThrow);

        await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);

        await triggerEvent("faqs/embedding.create", { faqId: faq.id });

        return faq;
      });
    }),
  update: mailboxProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().optional(),
        enabled: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        const faq = await tx
          .update(faqs)
          .set({ content: input.content, enabled: input.enabled, suggested: false })
          .where(and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)))
          .returning()
          .then(takeUniqueOrThrow);

        if (faq.suggested) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot update suggested FAQ, use accept or reject instead",
          });
        }

        await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);

        await triggerEvent("faqs/embedding.create", { faqId: faq.id });

        return faq;
      });
    }),
  delete: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    return await db.transaction(async (tx) => {
      const [faq] = await tx
        .select()
        .from(faqs)
        .where(and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)))
        .limit(1);
      if (!faq) {
        throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
      }

      await tx.delete(faqs).where(eq(faqs.id, faq.id));
      await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);
    });
  }),
  accept: mailboxProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const knowledge = await db.query.faqs.findFirst({
        where: and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)),
        with: {
          mailbox: true,
        },
      });

      if (!knowledge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge entry not found" });
      }

      await approveSuggestedEdit(knowledge, ctx.mailbox, ctx.user, input.content);
    }),
  reject: mailboxProcedure
    .input(
      z.object({
        id: z.number(),
        mailboxSlug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const knowledge = await db.query.faqs.findFirst({
        where: and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)),
        with: {
          mailbox: true,
        },
      });

      if (!knowledge) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Knowledge entry not found" });
      }

      await rejectSuggestedEdit(knowledge, ctx.mailbox, ctx.user);
    }),
  suggestFromHumanReply: mailboxProcedure
    .input(
      z.object({
        messageId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await db.query.conversationMessages.findFirst({
        where: and(eq(conversationMessages.id, input.messageId), eq(conversationMessages.role, "staff")),
        with: {
          conversation: {
            with: {
              mailbox: true,
            },
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Message not found" });
      }

      if (message.conversation.mailboxId !== ctx.mailbox.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Message not found in this mailbox" });
      }

      const messageContent = message.body || message.cleanedUpText || "";
      if (!messageContent.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Message content is empty" });
      }

      const similarFAQs = await findEnabledKnowledgeBankEntries(ctx.mailbox);

      const systemPrompt = `
You are analyzing a human agent's reply to a customer support inquiry.
Your task is to determine if this reply contains information valuable enough to create a new knowledge bank entry.

Based on the reply content and existing entries in the knowledge bank, decide on one of these actions:
1. no_action - This reply doesn't contain information worth adding to the knowledge bank. Choose this if:
   - The reply is too specific to one customer's situation
   - The information is already covered by existing entries
   - The reply is just a simple acknowledgment or greeting
   
2. create_entry - Create a new entry in the knowledge bank. Choose this if the reply contains:
   - Useful general information that could help answer similar questions
   - Step-by-step instructions
   - Policy explanations
   - Technical details that could be reused

If you choose create_entry, provide the content for the new entry. Extract only the valuable, reusable information from the reply. Remove customer-specific details, greetings, and conversational elements. Focus on the core information that would be useful for future similar inquiries.

Respond with a JSON object with these fields:
- action: "no_action" or "create_entry"
- reason: A brief explanation of your decision
- content: The content for the new entry (only for create_entry)
`;

      const userPrompt = `
Human agent's reply:
"${messageContent}"

Existing entries in knowledge bank:
${similarFAQs.map((faq) => `Content: "${faq.content}"`).join("\n\n")}
`;

      const suggestion = await runAIObjectQuery({
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        mailbox: ctx.mailbox,
        queryType: "suggest_knowledge_bank_from_reply",
        schema: suggestionResponseSchema,
      });

      return suggestion;
    }),
} satisfies TRPCRouterRecord;

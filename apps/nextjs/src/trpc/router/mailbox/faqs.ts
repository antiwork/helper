import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { mailboxProcedure } from "./procedure";

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
      .orderBy(desc(faqs.createdAt));
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

        inngest.send({
          name: "faqs/embedding.create",
          data: { faqId: faq.id },
        });

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

        await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);

        inngest.send({
          name: "faqs/embedding.create",
          data: { faqId: faq.id },
        });

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
        mailboxSlug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        const [faq] = await tx
          .select()
          .from(faqs)
          .where(and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)))
          .limit(1);

        if (!faq) {
          throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
        }

        await tx.update(faqs).set({ enabled: true, suggested: false }).where(eq(faqs.id, input.id));

        // If this is a replacement suggestion, delete the original entry
        if (faq.suggestedReplacementForId) {
          await tx.delete(faqs).where(eq(faqs.id, faq.suggestedReplacementForId));
        }

        await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);

        inngest.send({
          name: "faqs/embedding.create",
          data: { faqId: faq.id },
        });

        return faq;
      });
    }),
  reject: mailboxProcedure
    .input(
      z.object({
        id: z.number(),
        mailboxSlug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        const [faq] = await tx
          .select()
          .from(faqs)
          .where(and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)))
          .limit(1);

        if (!faq) {
          throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
        }

        await tx.delete(faqs).where(eq(faqs.id, input.id));
        await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);

        return faq;
      });
    }),
  tweak: mailboxProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string(),
        mailboxSlug: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await db.transaction(async (tx) => {
        const [faq] = await tx
          .select()
          .from(faqs)
          .where(and(eq(faqs.id, input.id), eq(faqs.mailboxId, ctx.mailbox.id)))
          .limit(1);

        if (!faq) {
          throw new TRPCError({ code: "NOT_FOUND", message: "FAQ not found" });
        }

        await tx
          .update(faqs)
          .set({ content: input.content, enabled: true, suggested: false })
          .where(eq(faqs.id, input.id));

        // If this is a replacement suggestion, delete the original entry
        if (faq.suggestedReplacementForId) {
          await tx.delete(faqs).where(eq(faqs.id, faq.suggestedReplacementForId));
        }

        await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);

        inngest.send({
          name: "faqs/embedding.create",
          data: { faqId: faq.id },
        });

        return faq;
      });
    }),
} satisfies TRPCRouterRecord;

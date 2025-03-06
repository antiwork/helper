import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import type { EditableWorkflow } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/settings/_components/automaticWorkflowsSetting";
import { MAX_STYLE_LINTERS } from "@/components/constants";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { styleLinters } from "@/db/schema";
import { DataError } from "@/lib/data/dataError";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import {
  createMailboxMetadataApi,
  deleteMailboxMetadataApiByMailboxSlug,
  testMailboxMetadataApiURL,
} from "@/lib/data/mailboxMetadataApi";
import { api } from "@/trpc/server";
import { mailboxProcedure } from "./mailbox/procedure";
import { getAuthorizedMailbox, protectedProcedure } from "@/trpc/trpc";

const errorResponse = (genericMessage: string, e?: unknown) => {
  return { error: e instanceof DataError ? e.message : genericMessage };
};

export const serverActionsRouter = {
  // Metadata endpoint procedures
  metadataEndpoint: {
    create: mailboxProcedure
      .input(z.object({ 
        mailboxSlug: z.string().optional(),
        url: z.string().url() 
      }))
      .mutation(async ({ ctx, input: { url } }) => {
        try {
          await createMailboxMetadataApi(ctx.mailbox.slug, { url });
          return { success: true, error: undefined };
        } catch (e) {
          return { success: false, error: e instanceof DataError ? e.message : "Error adding metadata endpoint" };
        }
      }),
    delete: mailboxProcedure
      .input(z.object({ mailboxSlug: z.string().optional() }))
      .mutation(async ({ ctx }) => {
      try {
        await deleteMailboxMetadataApiByMailboxSlug(ctx.mailbox.slug);
        return { success: true, error: undefined };
      } catch (e) {
        return { success: false, error: e instanceof DataError ? e.message : "Error deleting metadata endpoint" };
      }
    }),
    test: mailboxProcedure
      .input(z.object({ mailboxSlug: z.string().optional() }))
      .query(async ({ ctx }) => {
        try {
          await testMailboxMetadataApiURL(ctx.mailbox.slug);
          return { success: true, error: undefined };
        } catch (e) {
          return { success: false, error: e instanceof DataError ? e.message : "Error testing metadata endpoint" };
        }
      }),
  },

  // Style linter procedures
  styleLinter: {
    upsert: mailboxProcedure
      .input(
        z.object({
          mailboxSlug: z.string().optional(),
          linter: z.object({
            id: z.number().optional(),
            before: z.string(),
            after: z.string(),
          }),
        }),
      )
      .mutation(async ({ ctx, input: { linter } }) => {
        await db.transaction(async (tx) => {
          if (linter.id) {
            await tx
              .update(styleLinters)
              .set({
                before: linter.before,
                after: linter.after,
              })
              .where(
                and(
                  eq(styleLinters.id, linter.id),
                  eq(styleLinters.clerkOrganizationId, ctx.mailbox.clerkOrganizationId),
                ),
              )
              .returning();
          } else {
            const { count: existingLinterCount } = await tx
              .select({ count: count(styleLinters.id) })
              .from(styleLinters)
              .where(eq(styleLinters.clerkOrganizationId, ctx.mailbox.clerkOrganizationId))
              .then(takeUniqueOrThrow);
            if (existingLinterCount >= MAX_STYLE_LINTERS) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `You can only have a maximum of ${MAX_STYLE_LINTERS} style linters.`,
              });
            }
            await tx.insert(styleLinters).values({
              clerkOrganizationId: ctx.mailbox.clerkOrganizationId,
              before: linter.before,
              after: linter.after,
            });
          }

          await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);
        });

        return { success: true };
      }),
    delete: mailboxProcedure
      .input(
        z.object({
          id: z.number(),
        }),
      )
      .mutation(async ({ ctx, input: { id } }) => {
        await db.transaction(async (tx) => {
          await tx
            .delete(styleLinters)
            .where(and(eq(styleLinters.id, id), eq(styleLinters.clerkOrganizationId, ctx.mailbox.clerkOrganizationId)));

          await resetMailboxPromptUpdatedAt(tx, ctx.mailbox.id);
        });

        return { success: true };
      }),
  },

  // Prompt lines procedures
  promptLines: {
    update: mailboxProcedure
      .input(
        z.object({
          mailboxSlug: z.string().optional(),
          responseGeneratorPrompt: z.array(z.string()),
        }),
      )
      .mutation(async ({ ctx, input: { responseGeneratorPrompt } }) => {
        await api.mailbox.update({ mailboxSlug: ctx.mailbox.slug, responseGeneratorPrompt });
        return { success: true };
      }),
  },

  // Support email procedures
  supportEmail: {
    disconnect: mailboxProcedure
      .input(z.object({ mailboxSlug: z.string().optional() }))
      .mutation(async ({ ctx }) => {
        await api.gmailSupportEmail.delete({ mailboxSlug: ctx.mailbox.slug });
        return { success: true };
      }),
    authorize: mailboxProcedure
      .input(z.object({ mailboxSlug: z.string().optional() }))
      .mutation(({ ctx }) => {
        // This is a placeholder that will redirect to the Gmail authorization flow
        return { success: true };
      }),
  },

  // Conversation procedures
  conversation: {
    update: mailboxProcedure
      .input(
        z.object({
          conversationSlug: z.string(),
          status: z.enum(["open", "closed", "escalated", "spam"]).optional(),
          message: z.string().nullable().optional(),
          assignedToId: z.string().nullable().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await api.mailbox.conversations.update({
          ...input,
          mailboxSlug: ctx.mailbox.slug
        });
        return { success: true };
      }),
  },

  // Workflows procedures
  workflows: {
    save: mailboxProcedure
      .input(
        z.object({
          mailboxSlug: z.string().optional(),
          workflow: z.object({
            id: z.string().optional(),
            name: z.string(),
            description: z.string().optional(),
            enabled: z.boolean(),
            conditions: z.array(z.any()),
            actions: z.array(z.any()),
          }),
        }),
      )
      .mutation(async ({ ctx, input: { workflow } }) => {
        // Map the workflow object to the expected structure
        await api.mailbox.workflows.set({
          mailboxSlug: ctx.mailbox.slug,
          id: workflow.id ? parseInt(workflow.id) : undefined,
          name: workflow.name,
          prompt: workflow.description || "",
          action: "close_ticket", // Default action
          order: 1,
          runOnReplies: false,
          autoReplyFromMetadata: false
        });
        return { success: true };
      }),
    reorder: mailboxProcedure
      .input(
        z.object({
          positions: z.array(z.number()),
        }),
      )
      .mutation(async ({ ctx, input: { positions } }) => {
        await api.mailbox.workflows.reorder({ 
          mailboxSlug: ctx.mailbox.slug, 
          positions 
        });
        return { success: true };
      }),
  },
} satisfies TRPCRouterRecord;

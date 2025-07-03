/* eslint-disable @typescript-eslint/non-nullable-type-assertion-style */
import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { commonIssues } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { mailboxProcedure } from "./procedure";

export const commonIssuesRouter = {
  list: mailboxProcedure
    .query(async ({ ctx }) => {
      const conditions = [eq(commonIssues.mailboxId, ctx.mailbox.id)];

      const result = await db.query.commonIssues.findMany({
        where: and(...conditions),
        orderBy: [desc(commonIssues.createdAt), desc(commonIssues.updatedAt)],
      });

      const userIds = [...new Set(result.map((m) => m.createdByUserId).filter(Boolean))];
      const userDisplayNames =
        userIds.length > 0
          ? await db.query.authUsers.findMany({
              where: inArray(authUsers.id, userIds as string[]),
              columns: { id: true, email: true },
            })
          : [];

      const userMap = new Map(userDisplayNames.map((u) => [u.id, u.email]));

      return result.map((commmonIssue) => ({
        ...commmonIssue,
        createdByDisplayName: commmonIssue.createdByUserId
          ? userMap.get(commmonIssue.createdByUserId) || "Unknown"
          : "Admin",
        mailboxName: ctx.mailbox.name,
      }));
    }),

  get: mailboxProcedure.input(z.object({ slug: z.string().min(1).max(50) })).query(async ({ ctx, input }) => {
    const commonIssue = await db.query.commonIssues.findFirst({
      where: and(eq(commonIssues.slug, input.slug), eq(commonIssues.mailboxId, ctx.mailbox.id)),
    });

    if (!commonIssue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Common Issue not found",
      });
    }

    return commonIssue;
  }),

  create: mailboxProcedure
    .input(
      z.object({
        title: z.string().min(1).max(100).trim(),
        keywords: z.array(z.string().min(1).trim()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const commonIssue = await db
        .insert(commonIssues)
        .values({
          ...input,
          mailboxId: ctx.mailbox.id,
          createdByUserId: ctx.user.id,
        })
        .returning()
        .then(takeUniqueOrThrow);

      return commonIssue;
    }),

  update: mailboxProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(50),
        title: z.string().min(1).max(100).trim().optional(),
        keywords: z.array(z.string().min(1).trim()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingCommonIssue = await db.query.commonIssues.findFirst({
        where: and(eq(commonIssues.slug, input.slug), eq(commonIssues.mailboxId, ctx.mailbox.id)),
      });

      if (!existingCommonIssue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Common Issue not found",
        });
      }

      const { slug, ...updateData } = input;


      const updatedCommonIssue = await db
        .update(commonIssues)
        .set(updateData)
        .where(and(eq(commonIssues.slug, input.slug), eq(commonIssues.mailboxId, ctx.mailbox.id)))
        .returning()
        .then(takeUniqueOrThrow);

      return updatedCommonIssue;
    }),

  delete: mailboxProcedure.input(z.object({ slug: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const existingCommonIssue = await db.query.commonIssues.findFirst({
      where: and(eq(commonIssues.slug, input.slug), eq(commonIssues.mailboxId, ctx.mailbox.id)),
    });

    if (!existingCommonIssue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Saved reply not found",
      });
    }

    await db
      .delete(commonIssues)
      .where(and(eq(commonIssues.slug, input.slug), eq(commonIssues.mailboxId, ctx.mailbox.id)));

    return { success: true };
  }),
} satisfies TRPCRouterRecord;

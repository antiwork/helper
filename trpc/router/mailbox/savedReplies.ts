/* eslint-disable @typescript-eslint/non-nullable-type-assertion-style */
import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import DOMPurify from "isomorphic-dompurify";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { savedReplies } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { mailboxProcedure } from "./procedure";

const sanitizeContent = (content: string): string => {
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "ol", "ul", "li", "blockquote", "a"],
    ALLOWED_ATTR: ["href", "target", "rel"],
    KEEP_CONTENT: true,
  });
};

export const savedRepliesRouter = {
  list: mailboxProcedure
    .input(
      z.object({
        onlyActive: z.boolean().default(true),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.onlyActive) {
        conditions.push(eq(savedReplies.isActive, true));
      }

      if (input.search) {
        const searchConditions = [
          ilike(savedReplies.name, `%${input.search}%`),
          ilike(savedReplies.content, `%${input.search}%`),
        ] as SQL[];

        conditions.push(or(...searchConditions) as SQL);
      }

      const result = await db.query.savedReplies.findMany({
        where: and(...conditions),
        orderBy: [desc(savedReplies.usageCount), desc(savedReplies.updatedAt)],
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

      return result.map((savedReply) => ({
        ...savedReply,
        createdByDisplayName: savedReply.createdByUserId
          ? userMap.get(savedReply.createdByUserId) || "Unknown"
          : "Admin",
        mailboxName: ctx.mailbox.name,
      }));
    }),

  get: mailboxProcedure.input(z.object({ slug: z.string().min(1).max(50) })).query(async ({ input }) => {
    const savedReply = await db.query.savedReplies.findFirst({
      where: and(eq(savedReplies.slug, input.slug)),
    });

    if (!savedReply) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Saved reply not found",
      });
    }

    return savedReply;
  }),

  create: mailboxProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).trim(),
        content: z.string().min(1).trim(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const savedReply = await db
        .insert(savedReplies)
        .values({
          ...input,
          content: sanitizeContent(input.content),
          createdByUserId: ctx.user.id,
          unused_mailboxId: ctx.mailbox.id,
        })
        .returning()
        .then(takeUniqueOrThrow);

      return savedReply;
    }),

  update: mailboxProcedure
    .input(
      z.object({
        slug: z.string().min(1).max(50),
        name: z.string().min(1).max(100).trim().optional(),
        content: z.string().min(1).trim().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const existingSavedReply = await db.query.savedReplies.findFirst({
        where: and(eq(savedReplies.slug, input.slug)),
      });

      if (!existingSavedReply) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved reply not found",
        });
      }

      const { slug, ...updateData } = input;

      // Sanitize content if being updated
      const sanitizedUpdateData = {
        ...updateData,
        ...(updateData.content && { content: sanitizeContent(updateData.content) }),
        updatedAt: new Date(),
      };

      const updatedSavedReply = await db
        .update(savedReplies)
        .set(sanitizedUpdateData)
        .where(eq(savedReplies.slug, input.slug))
        .returning()
        .then(takeUniqueOrThrow);

      return updatedSavedReply;
    }),

  delete: mailboxProcedure.input(z.object({ slug: z.string().min(1) })).mutation(async ({ input }) => {
    const existingSavedReply = await db.query.savedReplies.findFirst({
      where: eq(savedReplies.slug, input.slug),
    });

    if (!existingSavedReply) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Saved reply not found",
      });
    }

    await db.delete(savedReplies).where(eq(savedReplies.slug, input.slug));

    return { success: true };
  }),

  incrementUsage: mailboxProcedure.input(z.object({ slug: z.string().min(1).max(50) })).mutation(async ({ input }) => {
    // Verify saved reply exists and is active before incrementing
    const savedReply = await db.query.savedReplies.findFirst({
      where: and(eq(savedReplies.slug, input.slug), eq(savedReplies.isActive, true)),
    });

    if (!savedReply) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Saved reply not found or access denied",
      });
    }

    await db
      .update(savedReplies)
      .set({
        usageCount: sql`${savedReplies.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(savedReplies.slug, input.slug));

    return { success: true };
  }),
} satisfies TRPCRouterRecord;

/* eslint-disable @typescript-eslint/non-nullable-type-assertion-style */
import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import DOMPurify from "dompurify";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { JSDOM } from "jsdom";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { macros } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { mailboxProcedure } from "./procedure";

const window = new JSDOM("").window;
const purify = DOMPurify(window);

const sanitizeContent = (content: string): string => {
  return purify.sanitize(content, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

const createSavedReplySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  content: z.string().min(1).max(5000).trim(),
  description: z.string().max(500).trim().optional().or(z.literal("")),
  shortcut: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Shortcut must contain only lowercase letters, numbers, and hyphens")
    .max(20)
    .optional()
    .or(z.literal("")),
});

const updateSavedReplySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Invalid slug format"),
  name: z.string().min(1).max(100).trim().optional(),
  content: z.string().min(1).max(5000).trim().optional(),
  description: z.string().max(500).trim().optional().or(z.literal("")),
  shortcut: z
    .string()
    .regex(/^[a-z0-9-]+$/, "Shortcut must contain only lowercase letters, numbers, and hyphens")
    .max(20)
    .optional()
    .or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const savedRepliesRouter = {
  list: mailboxProcedure
    .input(
      z.object({
        onlyActive: z.boolean().default(true),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(macros.mailboxId, ctx.mailbox.id)];

      if (input.onlyActive) {
        conditions.push(eq(macros.isActive, true));
      }

      if (input.search) {
        const searchConditions = [
          ilike(macros.name, `%${input.search}%`),
          ilike(macros.content, `%${input.search}%`),
          ilike(macros.description, `%${input.search}%`),
          ilike(macros.shortcut, `%${input.search}%`),
        ] as SQL[];

        conditions.push(or(...searchConditions) as SQL);
      }

      const result = await db.query.macros.findMany({
        where: and(...conditions),
        orderBy: [desc(macros.usageCount), desc(macros.updatedAt)],
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

  get: mailboxProcedure.input(z.object({ slug: z.string().min(1).max(50) })).query(async ({ ctx, input }) => {
    const savedReply = await db.query.macros.findFirst({
      where: and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)),
    });

    if (!savedReply) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Saved reply not found",
      });
    }

    return savedReply;
  }),

  create: mailboxProcedure.input(createSavedReplySchema).mutation(async ({ ctx, input }) => {
    // Use transaction to prevent race condition in shortcut validation
    return await db.transaction(async (tx) => {
      if (input.shortcut) {
        const existingShortcut = await tx.query.macros.findFirst({
          where: and(
            eq(macros.mailboxId, ctx.mailbox.id),
            eq(macros.shortcut, input.shortcut),
            eq(macros.isActive, true),
          ),
        });

        if (existingShortcut) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A saved reply with this shortcut already exists",
          });
        }
      }

      const savedReply = await tx
        .insert(macros)
        .values({
          ...input,
          content: sanitizeContent(input.content),
          description: input.description ? sanitizeContent(input.description) : input.description,
          mailboxId: ctx.mailbox.id,
          createdByUserId: ctx.user.id,
        })
        .returning()
        .then(takeUniqueOrThrow);

      return savedReply;
    });
  }),

  update: mailboxProcedure.input(updateSavedReplySchema).mutation(async ({ ctx, input }) => {
    const existingSavedReply = await db.query.macros.findFirst({
      where: and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)),
    });

    if (!existingSavedReply) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Saved reply not found",
      });
    }

    // Check if user can edit (creator or admin)
    const mailboxAccess = ctx.user.user_metadata?.mailboxAccess;
    const userRole = mailboxAccess?.[ctx.mailbox.id]?.role;
    const canEdit = existingSavedReply.createdByUserId === ctx.user.id || userRole === "core";

    if (!canEdit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to edit this saved reply",
      });
    }

    // Use transaction to prevent race condition in shortcut validation
    return await db.transaction(async (tx) => {
      if (input.shortcut && input.shortcut !== existingSavedReply.shortcut) {
        const existingShortcut = await tx.query.macros.findFirst({
          where: and(
            eq(macros.mailboxId, ctx.mailbox.id),
            eq(macros.shortcut, input.shortcut),
            eq(macros.isActive, true),
          ),
        });

        if (existingShortcut) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A saved reply with this shortcut already exists",
          });
        }
      }

      const { slug, ...updateData } = input;

      // Sanitize content fields if they're being updated
      const sanitizedUpdateData = {
        ...updateData,
        ...(updateData.content && { content: sanitizeContent(updateData.content) }),
        ...(updateData.description !== undefined &&
          updateData.description !== "" && {
            description: sanitizeContent(updateData.description),
          }),
        updatedAt: new Date(),
      };

      const updatedSavedReply = await tx
        .update(macros)
        .set(sanitizedUpdateData)
        .where(and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)))
        .returning()
        .then(takeUniqueOrThrow);

      return updatedSavedReply;
    });
  }),

  delete: mailboxProcedure.input(z.object({ slug: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const existingSavedReply = await db.query.macros.findFirst({
      where: and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)),
    });

    if (!existingSavedReply) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Saved reply not found",
      });
    }

    // Check if user can delete (creator or admin)
    const mailboxAccess = ctx.user.user_metadata?.mailboxAccess;
    const userRole = mailboxAccess?.[ctx.mailbox.id]?.role;
    const canDelete = existingSavedReply.createdByUserId === ctx.user.id || userRole === "core";

    if (!canDelete) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this saved reply",
      });
    }

    // Add mailboxId validation to prevent cross-mailbox deletion
    await db.delete(macros).where(and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)));

    return { success: true };
  }),

  incrementUsage: mailboxProcedure
    .input(z.object({ slug: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      // Verify saved reply exists and is active before incrementing
      const savedReply = await db.query.macros.findFirst({
        where: and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id), eq(macros.isActive, true)),
      });

      if (!savedReply) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Saved reply not found or access denied",
        });
      }

      await db
        .update(macros)
        .set({
          usageCount: sql`${macros.usageCount} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)));

      return { success: true };
    }),
} satisfies TRPCRouterRecord;

// Keep backwards compatibility during migration
export const macrosRouter = savedRepliesRouter;

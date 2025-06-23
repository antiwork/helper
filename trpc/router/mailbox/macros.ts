import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { macros } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { mailboxProcedure } from "./procedure";

const createMacroSchema = z.object({
  name: z.string().min(1).max(100),
  content: z.string().min(1).max(5000),
  description: z.string().max(500).optional(),
  shortcut: z.string().max(20).optional(),
  isGlobal: z.boolean().default(false),
});

const updateMacroSchema = z.object({
  slug: z.string(),
  name: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  description: z.string().max(500).optional(),
  shortcut: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
});

export const macrosRouter = {
  list: mailboxProcedure
    .input(
      z.object({
        includePersonal: z.boolean().default(true),
        includeGlobal: z.boolean().default(true),
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

      const accessConditions: SQL[] = [];
      if (input.includeGlobal) {
        accessConditions.push(eq(macros.isGlobal, true) as SQL);
      }
      if (input.includePersonal) {
        accessConditions.push(and(eq(macros.isGlobal, false), eq(macros.createdByUserId, ctx.user.id)) as SQL);
      }

      if (accessConditions.length > 0) {
        conditions.push(or(...accessConditions) as SQL);
      }

      const result = await db.query.macros.findMany({
        where: and(...conditions),
        orderBy: [desc(macros.usageCount), desc(macros.updatedAt)],
        with: {
          mailbox: {
            columns: { name: true },
          },
        },
      });

      const userIds = [...new Set(result.map((m) => m.createdByUserId).filter(Boolean))];
      const userDisplayNames =
        userIds.length > 0
          ? await db.query.authUsers.findMany({
              where: inArray(authUsers.id, userIds),
              columns: { id: true, email: true },
            })
          : [];

      const userMap = new Map(userDisplayNames.map((u) => [u.id, u.email]));

      return result.map((macro) => ({
        ...macro,
        createdByDisplayName: macro.createdByUserId ? userMap.get(macro.createdByUserId) || "Unknown" : "Admin",
        mailboxName: macro.mailbox.name,
      }));
    }),

  get: mailboxProcedure.input(z.object({ slug: z.string() })).query(async ({ ctx, input }) => {
    const macro = await db.query.macros.findFirst({
      where: and(
        eq(macros.slug, input.slug),
        eq(macros.mailboxId, ctx.mailbox.id),
        or(eq(macros.isGlobal, true), eq(macros.createdByUserId, ctx.user.id)),
      ),
    });

    if (!macro) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Macro not found",
      });
    }

    return macro;
  }),

  create: mailboxProcedure.input(createMacroSchema).mutation(async ({ ctx, input }) => {
    if (input.isGlobal) {
      const userRole = ctx.user.user_metadata?.mailboxAccess?.[ctx.mailbox.id]?.role;
      if (userRole !== "core") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only core team members can create global macros",
        });
      }
    }

    if (input.shortcut) {
      const existingShortcut = await db.query.macros.findFirst({
        where: and(
          eq(macros.mailboxId, ctx.mailbox.id),
          eq(macros.shortcut, input.shortcut),
          eq(macros.isActive, true),
        ),
      });

      if (existingShortcut) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A macro with this shortcut already exists",
        });
      }
    }

    const macro = await db
      .insert(macros)
      .values({
        ...input,
        mailboxId: ctx.mailbox.id,
        createdByUserId: input.isGlobal ? null : ctx.user.id,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return macro;
  }),

  update: mailboxProcedure.input(updateMacroSchema).mutation(async ({ ctx, input }) => {
    const existingMacro = await db.query.macros.findFirst({
      where: and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)),
    });

    if (!existingMacro) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Macro not found",
      });
    }

    const canEdit = existingMacro.isGlobal
      ? ctx.user.user_metadata?.mailboxAccess?.[ctx.mailbox.id]?.role === "core"
      : existingMacro.createdByUserId === ctx.user.id;

    if (!canEdit) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to edit this macro",
      });
    }

    if (input.shortcut && input.shortcut !== existingMacro.shortcut) {
      const existingShortcut = await db.query.macros.findFirst({
        where: and(
          eq(macros.mailboxId, ctx.mailbox.id),
          eq(macros.shortcut, input.shortcut),
          eq(macros.isActive, true),
        ),
      });

      if (existingShortcut) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A macro with this shortcut already exists",
        });
      }
    }

    const { slug, ...updateData } = input;

    const updatedMacro = await db
      .update(macros)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(macros.slug, input.slug))
      .returning()
      .then(takeUniqueOrThrow);

    return updatedMacro;
  }),

  delete: mailboxProcedure.input(z.object({ slug: z.string() })).mutation(async ({ ctx, input }) => {
    const existingMacro = await db.query.macros.findFirst({
      where: and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)),
    });

    if (!existingMacro) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Macro not found",
      });
    }

    const canDelete = existingMacro.isGlobal
      ? ctx.user.user_metadata?.mailboxAccess?.[ctx.mailbox.id]?.role === "core"
      : existingMacro.createdByUserId === ctx.user.id;

    if (!canDelete) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have permission to delete this macro",
      });
    }

    await db.delete(macros).where(eq(macros.slug, input.slug));

    return { success: true };
  }),

  incrementUsage: mailboxProcedure.input(z.object({ slug: z.string() })).mutation(async ({ ctx, input }) => {
    await db
      .update(macros)
      .set({
        usageCount: sql`${macros.usageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(macros.slug, input.slug), eq(macros.mailboxId, ctx.mailbox.id)));

    return { success: true };
  }),

  analytics: mailboxProcedure.query(async ({ ctx }) => {
    const [mostUsed, recentlyCreated, totalMacrosResult] = await Promise.all([
      db.query.macros.findMany({
        where: and(eq(macros.mailboxId, ctx.mailbox.id), eq(macros.isActive, true)),
        orderBy: [desc(macros.usageCount)],
        limit: 10,
      }),
      db.query.macros.findMany({
        where: and(eq(macros.mailboxId, ctx.mailbox.id), eq(macros.isActive, true)),
        orderBy: [desc(macros.createdAt)],
        limit: 5,
      }),
      db
        .select({ count: sql<number>`count(*)` })
        .from(macros)
        .where(and(eq(macros.mailboxId, ctx.mailbox.id), eq(macros.isActive, true))),
    ]);

    return {
      mostUsed,
      recentlyCreated,
      totalMacros: totalMacrosResult[0]?.count || 0,
      totalUsage: mostUsed.reduce((sum, macro) => sum + macro.usageCount, 0),
    };
  }),
} satisfies TRPCRouterRecord;

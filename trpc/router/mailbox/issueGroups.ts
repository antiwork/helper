import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversations, issueGroups, mailboxes, platformCustomers, userProfiles } from "@/db/schema";
import { mailboxProcedure } from "./procedure";

export const issueGroupsRouter = {
  list: mailboxProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const groupsWithCounts = await db
        .select({
          id: issueGroups.id,
          title: issueGroups.title,
          description: issueGroups.description,
          createdAt: issueGroups.createdAt,
          updatedAt: issueGroups.updatedAt,
          openCount: sql<number>`COUNT(*)::int`,
          todayCount: sql<number>`COUNT(CASE WHEN ${conversations.createdAt} >= ${startOfToday}::timestamp THEN 1 END)::int`,
          weekCount: sql<number>`COUNT(CASE WHEN ${conversations.createdAt} >= ${startOfWeek}::timestamp THEN 1 END)::int`,
          monthCount: sql<number>`COUNT(CASE WHEN ${conversations.createdAt} >= ${startOfMonth}::timestamp THEN 1 END)::int`,
          vipCount: sql<number>`COUNT(CASE WHEN ${platformCustomers.value} >= COALESCE(${mailboxes.vipThreshold}, 999999) * 100 THEN 1 END)::int`,
        })
        .from(issueGroups)
        .leftJoin(conversations, and(eq(issueGroups.id, conversations.issueGroupId), eq(conversations.status, "open")))
        .leftJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
        .leftJoin(mailboxes, eq(mailboxes.id, ctx.mailbox.id))
        .groupBy(
          issueGroups.id,
          issueGroups.title,
          issueGroups.description,
          issueGroups.createdAt,
          issueGroups.updatedAt,
        )
        .orderBy(desc(issueGroups.createdAt))
        .limit(limit)
        .offset(offset);

      const groups = groupsWithCounts.map((group) => ({
        ...group,
        openCount: Number(group.openCount || 0),
        todayCount: Number(group.todayCount || 0),
        weekCount: Number(group.weekCount || 0),
        monthCount: Number(group.monthCount || 0),
        vipCount: Number(group.vipCount || 0),
      }));

      return { groups };
    }),

  listAll: mailboxProcedure.query(async () => {
    const groups = await db
      .select({
        id: issueGroups.id,
        title: issueGroups.title,
        description: issueGroups.description,
        createdAt: issueGroups.createdAt,
        updatedAt: issueGroups.updatedAt,
        conversationCount: sql<number>`COUNT(${conversations.id})::int`,
      })
      .from(issueGroups)
      .leftJoin(conversations, eq(issueGroups.id, conversations.issueGroupId))
      .groupBy(issueGroups.id, issueGroups.title, issueGroups.description, issueGroups.createdAt, issueGroups.updatedAt)
      .orderBy(desc(issueGroups.createdAt));

    return { groups };
  }),

  get: mailboxProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const group = await db.query.issueGroups.findFirst({
      where: eq(issueGroups.id, input.id),
      with: {
        conversations: {
          columns: {
            id: true,
            slug: true,
            subject: true,
            emailFrom: true,
            status: true,
            createdAt: true,
            assignedToId: true,
          },
        },
      },
    });

    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
    }

    return group;
  }),

  create: mailboxProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const newGroup = await db
        .insert(issueGroups)
        .values({
          title: input.title,
          description: input.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      return newGroup;
    }),

  update: mailboxProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { id, title, description } = input;

      const existingGroup = await db.query.issueGroups.findFirst({
        where: eq(issueGroups.id, id),
      });

      if (!existingGroup) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
      }

      const updatedGroup = await db
        .update(issueGroups)
        .set({
          title,
          description,
          updatedAt: new Date(),
        })
        .where(eq(issueGroups.id, id))
        .returning()
        .then(takeUniqueOrThrow);

      return updatedGroup;
    }),

  delete: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const group = await db.query.issueGroups.findFirst({
      where: eq(issueGroups.id, input.id),
      with: {
        conversations: {
          columns: { id: true },
        },
      },
    });

    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
    }

    await db.transaction(async (tx) => {
      if (group.conversations.length > 0) {
        await tx.update(conversations).set({ issueGroupId: null }).where(eq(conversations.issueGroupId, input.id));
      }

      await tx.delete(issueGroups).where(eq(issueGroups.id, input.id));
    });

    return { success: true, unassignedConversations: group.conversations.length };
  }),

  assignConversation: mailboxProcedure
    .input(
      z.object({
        conversationId: z.number(),
        issueGroupId: z.number().nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, input.conversationId),
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      if (input.issueGroupId) {
        const issueGroup = await db.query.issueGroups.findFirst({
          where: eq(issueGroups.id, input.issueGroupId),
        });

        if (!issueGroup) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
        }
      }

      await db
        .update(conversations)
        .set({ issueGroupId: input.issueGroupId })
        .where(eq(conversations.id, input.conversationId));

      return { success: true };
    }),

  pinnedList: mailboxProcedure.query(async ({ ctx }) => {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, ctx.user.id),
    });

    if (
      !userProfile?.pinnedIssueGroupIds ||
      !Array.isArray(userProfile.pinnedIssueGroupIds) ||
      userProfile.pinnedIssueGroupIds.length === 0
    ) {
      return { groups: [] };
    }

    const pinnedIds = userProfile.pinnedIssueGroupIds;

    const pinnedGroups = await db
      .select({
        id: issueGroups.id,
        title: issueGroups.title,
        description: issueGroups.description,
        openCount: count(conversations.id),
      })
      .from(issueGroups)
      .leftJoin(conversations, and(eq(issueGroups.id, conversations.issueGroupId), eq(conversations.status, "open")))
      .where(inArray(issueGroups.id, pinnedIds))
      .groupBy(issueGroups.id)
      .orderBy(desc(issueGroups.createdAt))
      .limit(10);

    return { groups: pinnedGroups };
  }),

  pin: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const group = await db.query.issueGroups.findFirst({
      where: eq(issueGroups.id, input.id),
    });

    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
    }

    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, ctx.user.id),
    });

    const currentPinned = Array.isArray(userProfile?.pinnedIssueGroupIds) ? userProfile.pinnedIssueGroupIds : [];

    if (!currentPinned.includes(input.id)) {
      await db
        .update(userProfiles)
        .set({
          pinnedIssueGroupIds: [...currentPinned, input.id],
        })
        .where(eq(userProfiles.id, ctx.user.id));
    }

    return { success: true };
  }),

  unpin: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, ctx.user.id),
    });

    const currentPinned = Array.isArray(userProfile?.pinnedIssueGroupIds) ? userProfile.pinnedIssueGroupIds : [];

    const updatedPinned = currentPinned.filter((id) => id !== input.id);

    await db
      .update(userProfiles)
      .set({
        pinnedIssueGroupIds: updatedPinned,
      })
      .where(eq(userProfiles.id, ctx.user.id));

    return { success: true };
  }),

  generateSuggestions: mailboxProcedure.mutation(async ({ ctx }) => {
    const { generateCommonIssuesSuggestions } = await import("@/lib/ai/generateCommonIssues");

    const result = await generateCommonIssuesSuggestions(ctx.mailbox);

    if (result.issues.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No common issues could be generated from existing conversations",
      });
    }

    return result;
  }),

  bulkCreate: mailboxProcedure
    .input(
      z.object({
        items: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ input }) => {
      const createdIssues = await Promise.all(
        input.items.map((item) =>
          db
            .insert(issueGroups)
            .values({
              title: item.title,
              description: item.description,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .returning()
            .then(takeUniqueOrThrow),
        ),
      );

      return {
        createdIssues: createdIssues.length,
        issues: createdIssues.map((issue) => ({
          id: issue.id,
          title: issue.title,
          description: issue.description,
        })),
      };
    }),
} satisfies TRPCRouterRecord;

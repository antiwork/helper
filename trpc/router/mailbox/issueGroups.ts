import { TRPCError, TRPCRouterRecord } from "@trpc/server";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversations, issueGroups, mailboxes, platformCustomers, userProfiles } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { mailboxProcedure } from "./procedure";

export const issueGroupsRouter = {
  // List all issue groups for a mailbox with conversation counts
  list: mailboxProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(100),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;

      // Get current date boundaries for time-based counting
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Get issue groups with conversation counts
      const groupsWithCounts = await db
        .select({
          id: issueGroups.id,
          title: issueGroups.title,
          description: issueGroups.description,
          createdAt: issueGroups.createdAt,
          updatedAt: issueGroups.updatedAt,
          totalCount: count(conversations.id),
          openCount: sql<number>`COUNT(CASE WHEN ${conversations.status} = 'open' THEN 1 END)::int`,
          todayCount: sql<number>`COUNT(CASE WHEN ${conversations.status} = 'open' AND ${conversations.createdAt} >= ${startOfToday}::timestamp THEN 1 END)::int`,
          weekCount: sql<number>`COUNT(CASE WHEN ${conversations.status} = 'open' AND ${conversations.createdAt} >= ${startOfWeek}::timestamp THEN 1 END)::int`,
          monthCount: sql<number>`COUNT(CASE WHEN ${conversations.status} = 'open' AND ${conversations.createdAt} >= ${startOfMonth}::timestamp THEN 1 END)::int`,
          vipCount: sql<number>`COUNT(CASE WHEN ${conversations.status} = 'open' AND ${platformCustomers.value} >= COALESCE(${mailboxes.vipThreshold}, 999999) * 100 THEN 1 END)::int`,
        })
        .from(issueGroups)
        .leftJoin(conversations, eq(issueGroups.id, conversations.issueGroupId))
        .leftJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
        .leftJoin(mailboxes, eq(issueGroups.mailboxId, mailboxes.id))
        .where(eq(issueGroups.mailboxId, ctx.mailbox.id))
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

      // Filter out groups with 0 open conversations for the main view
      const activeGroups = groups.filter((group) => group.openCount > 0);

      return { groups: activeGroups };
    }),

  // Get all issue groups for settings (including those with 0 conversations)
  listAll: mailboxProcedure.query(async ({ ctx }) => {
    const groups = await db
      .select({
        id: issueGroups.id,
        title: issueGroups.title,
        description: issueGroups.description,
        createdAt: issueGroups.createdAt,
        updatedAt: issueGroups.updatedAt,
        conversationCount: count(conversations.id),
      })
      .from(issueGroups)
      .leftJoin(conversations, eq(issueGroups.id, conversations.issueGroupId))
      .where(eq(issueGroups.mailboxId, ctx.mailbox.id))
      .groupBy(issueGroups.id, issueGroups.title, issueGroups.description, issueGroups.createdAt, issueGroups.updatedAt)
      .orderBy(desc(issueGroups.createdAt));

    return { groups };
  }),

  // Get a specific issue group
  get: mailboxProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    const group = await db.query.issueGroups.findFirst({
      where: and(eq(issueGroups.id, input.id), eq(issueGroups.mailboxId, ctx.mailbox.id)),
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

  // Create a new issue group
  create: mailboxProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newGroup = await db
        .insert(issueGroups)
        .values({
          mailboxId: ctx.mailbox.id,
          title: input.title,
          description: input.description,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()
        .then(takeUniqueOrThrow);

      return newGroup;
    }),

  // Update an issue group
  update: mailboxProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, title, description } = input;

      // Verify ownership
      const existingGroup = await db.query.issueGroups.findFirst({
        where: and(eq(issueGroups.id, id), eq(issueGroups.mailboxId, ctx.mailbox.id)),
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

  // Delete an issue group
  delete: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    // Verify ownership and get conversation count
    const group = await db.query.issueGroups.findFirst({
      where: and(eq(issueGroups.id, input.id), eq(issueGroups.mailboxId, ctx.mailbox.id)),
      with: {
        conversations: {
          columns: { id: true },
        },
      },
    });

    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
    }

    // Unassign all conversations from this group
    if (group.conversations.length > 0) {
      await db.update(conversations).set({ issueGroupId: null }).where(eq(conversations.issueGroupId, input.id));
    }

    // Delete the group
    await db.delete(issueGroups).where(eq(issueGroups.id, input.id));

    return { success: true, unassignedConversations: group.conversations.length };
  }),

  // Assign a conversation to an issue group
  assignConversation: mailboxProcedure
    .input(
      z.object({
        conversationId: z.number(),
        issueGroupId: z.number().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify conversation exists
      const conversation = await db.query.conversations.findFirst({
        where: eq(conversations.id, input.conversationId),
      });

      if (!conversation) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      }

      // If issueGroupId is provided, verify it belongs to this mailbox
      if (input.issueGroupId) {
        const issueGroup = await db.query.issueGroups.findFirst({
          where: and(eq(issueGroups.id, input.issueGroupId), eq(issueGroups.mailboxId, ctx.mailbox.id)),
        });

        if (!issueGroup) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
        }
      }

      // Update the conversation
      await db
        .update(conversations)
        .set({ issueGroupId: input.issueGroupId })
        .where(eq(conversations.id, input.conversationId));

      // Trigger realtime update for issue groups
      await triggerEvent("issue-groups/status-changed", { conversationId: input.conversationId });

      return { success: true };
    }),

  // Bulk close all conversations in an issue group
  bulkCloseAll: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    // Verify group belongs to this mailbox
    const group = await db.query.issueGroups.findFirst({
      where: and(eq(issueGroups.id, input.id), eq(issueGroups.mailboxId, ctx.mailbox.id)),
      with: {
        conversations: {
          columns: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
    }

    const openConversationIds = group.conversations.filter((c) => c.status === "open").map((c) => c.id);

    if (openConversationIds.length === 0) {
      return { updatedCount: 0 };
    }

    await triggerEvent("conversations/bulk-update", {
      userId: ctx.user.id,
      conversationFilter: openConversationIds,
      status: "closed",
    });

    return { updatedCount: openConversationIds.length };
  }),

  // Get pinned issue groups for current user
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

    // pinnedIssueGroupIds is properly typed as number[] in the schema
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
      .where(and(eq(issueGroups.mailboxId, ctx.mailbox.id), inArray(issueGroups.id, pinnedIds)))
      .groupBy(issueGroups.id)
      .orderBy(desc(issueGroups.createdAt))
      .limit(10);

    // Filter out pinned groups with 0 open conversations
    const activePinnedGroups = pinnedGroups.filter((group) => group.openCount > 0);

    return { groups: activePinnedGroups };
  }),

  // Pin an issue group for current user
  pin: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    // Verify issue group exists and belongs to this mailbox
    const group = await db.query.issueGroups.findFirst({
      where: and(eq(issueGroups.id, input.id), eq(issueGroups.mailboxId, ctx.mailbox.id)),
    });

    if (!group) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Issue group not found" });
    }

    // Get current user profile
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, ctx.user.id),
    });

    const currentPinned = Array.isArray(userProfile?.pinnedIssueGroupIds) ? userProfile.pinnedIssueGroupIds : [];

    // Add to pinned if not already there
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

  // Unpin an issue group for current user
  unpin: mailboxProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    // Get current user profile
    const userProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.id, ctx.user.id),
    });

    const currentPinned = Array.isArray(userProfile?.pinnedIssueGroupIds) ? userProfile.pinnedIssueGroupIds : [];

    // Remove from pinned
    const updatedPinned = currentPinned.filter((id) => id !== input.id);

    await db
      .update(userProfiles)
      .set({
        pinnedIssueGroupIds: updatedPinned,
      })
      .where(eq(userProfiles.id, ctx.user.id));

    return { success: true };
  }),
} satisfies TRPCRouterRecord;

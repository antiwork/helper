import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { subHours } from "date-fns";
import { z } from "zod";
import { getMemberStats } from "@/lib/data/stats";
import { banUser, getProfile, getUsersWithMailboxAccess, isAdmin, updateUserMailboxData } from "@/lib/data/user";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { mailboxProcedure } from "./procedure";

export const membersRouter = {
  update: mailboxProcedure
    .input(
      z.object({
        userId: z.string(),
        displayName: z.string().optional(),
        role: z.enum(["core", "nonCore", "afk"]).optional(),
        keywords: z.array(z.string()).optional(),
        permissions: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userProfile = await getProfile(ctx.user.id);
      if (!userProfile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User profile not found",
        });
      }
      const isCurrentUserAdmin = isAdmin(userProfile);

      if (!isCurrentUserAdmin && ctx.user.id !== input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You can only update your own display name.",
        });
      }

      const updatePayload: Record<string, any> = {};

      if (isCurrentUserAdmin) {
        updatePayload.displayName = input.displayName;
        updatePayload.role = input.role;
        updatePayload.keywords = input.keywords;
        updatePayload.permissions = input.permissions;
      } else {
        updatePayload.displayName = input.displayName;
      }

      try {
        const user = await updateUserMailboxData(input.userId, updatePayload);
        return { user };
      } catch (error) {
        captureExceptionAndLog(error, {
          extra: {
            userId: input.userId,
            displayName: input.displayName,
            keywords: input.keywords,
            role: input.role,
            permissions: input.permissions,
          },
        });
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update team member",
        });
      }
    }),

  list: mailboxProcedure.query(async ({ ctx }) => {
    return {
      members: await getUsersWithMailboxAccess(),
      isAdmin: isAdmin(await getProfile(ctx.user.id)),
    };
  }),

  delete: mailboxProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userProfile = await getProfile(ctx.user.id);

      if (!isAdmin(userProfile)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You do not have permission to remove team members.",
        });
      }

      if (ctx.user.id === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the team.",
        });
      }

      try {
        await banUser(input.id);
        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error, {
          tags: { route: "mailbox.members.delete" },
          extra: {
            targetUserId: input.id,
            mailboxId: ctx.mailbox.id,
          },
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to remove team member.",
        });
      }
    }),

  stats: mailboxProcedure
    .input(
      z.object({
        period: z.enum(["24h", "7d", "30d", "1y"]),
        customStartDate: z.date().optional(),
        customEndDate: z.date().optional(),
      }),
    )
    .query(async ({ input }) => {
      const now = new Date();
      const periodInHours = {
        "24h": 24,
        "7d": 24 * 7,
        "30d": 24 * 30,
        "1y": 24 * 365,
      } as const;

      const startDate = input.customStartDate || subHours(now, periodInHours[input.period]);
      const endDate = input.customEndDate || now;
      return await getMemberStats({ startDate, endDate });
    }),
} satisfies TRPCRouterRecord;

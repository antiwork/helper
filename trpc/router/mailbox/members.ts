import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { subHours } from "date-fns";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema/userProfiles";
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
      try {
          const user = await updateUserMailboxData(input.userId, ctx.mailbox.id, {
            displayName: input.displayName,
            role: input.role,
            keywords: input.keywords,
            permissions: input.permissions,
          });

          console.log("Updated user mailbox data:", user)

          return { user }
      } catch (error) {
        captureExceptionAndLog(error, {
          extra: {
            userId: input.userId,
            displayName: input.displayName,
            keywords: input.keywords,
            role: input.role,
            permissions: input.permissions,
            mailboxId: ctx.mailbox.id,
            mailboxSlug: ctx.mailbox.slug,
          },
        });
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update team member",
        });
      }
    }),

  list: mailboxProcedure.query(async ({ ctx }) => {
    try {
      const members = await getUsersWithMailboxAccess(ctx.mailbox.id);
      return members;
    } catch (error) {
      captureExceptionAndLog(error, {
        tags: { route: "mailbox.members.list" },
        extra: {
          mailboxId: ctx.mailbox.id,
          mailboxSlug: ctx.mailbox.slug,
        },
      });
      return [];
    }
  }),

  delete: mailboxProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {

      if (ctx.user.id === input.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove yourself from the team.",
        });
      }

      try {
        await banUser(input.id);
      } catch (error) {
        captureExceptionAndLog(error, {
          tags: { route: "mailbox.members.delete" },
          extra: {
            targetUserId: input.id,
            mailboxId: ctx.mailbox.id,
            mailboxSlug: ctx.mailbox.slug,
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
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const periodInHours = {
        "24h": 24,
        "7d": 24 * 7,
        "30d": 24 * 30,
        "1y": 24 * 365,
      } as const;

      const startDate = input.customStartDate || subHours(now, periodInHours[input.period]);
      const endDate = input.customEndDate || now;
      return await getMemberStats(ctx.mailbox, { startDate, endDate });
    }),
} satisfies TRPCRouterRecord;

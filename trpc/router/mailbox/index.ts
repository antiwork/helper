import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { subDays } from "date-fns";
import { and, count, eq, isNotNull, isNull, SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { getGuideSessionsForMailbox } from "@/lib/data/guide";
import { getMailboxInfo } from "@/lib/data/mailbox";
import { getMemberStats } from "@/lib/data/stats";
import { conversationsRouter } from "./conversations/index";
import { customersRouter } from "./customers";
import { faqsRouter } from "./faqs";
import { githubRouter } from "./github";
import { issueGroupsRouter } from "./issueGroups";
import { membersRouter } from "./members";
import { mailboxProcedure } from "./procedure";
import { savedRepliesRouter } from "./savedReplies";
import { slackRouter } from "./slack";
import { toolsRouter } from "./tools";
import { websitesRouter } from "./websites";

export { mailboxProcedure };

export const mailboxRouter = {
  openCount: mailboxProcedure.query(async ({ ctx }) => {
    const countOpenStatus = async (where?: SQL) => {
      const result = await db
        .select({ count: count() })
        .from(conversations)
        .where(and(eq(conversations.status, "open"), isNull(conversations.mergedIntoId), where));
      return result[0]?.count ?? 0;
    };

    const [all, mine, assigned] = await Promise.all([
      countOpenStatus(),
      countOpenStatus(eq(conversations.assignedToId, ctx.user.id)),
      countOpenStatus(isNotNull(conversations.assignedToId)),
    ]);

    return {
      all,
      mine,
      assigned,
      unassigned: all - assigned,
    };
  }),
  get: mailboxProcedure.query(({ ctx }) => getMailboxInfo(ctx.mailbox)),
  update: mailboxProcedure
    .input(
      z.object({
        slackAlertChannel: z.string().nullable().optional(),
        githubRepoOwner: z.string().optional(),
        githubRepoName: z.string().optional(),
        widgetDisplayMode: z.enum(["off", "always", "revenue_based"]).optional(),
        widgetDisplayMinValue: z.number().nullable().optional(),
        widgetHost: z.string().nullable().optional(),
        customerInfoUrl: z.string().nullable().optional(),
        vipThreshold: z.number().nullable().optional(),
        vipChannelId: z.string().nullable().optional(),
        vipExpectedResponseHours: z.number().nullable().optional(),
        autoCloseEnabled: z.boolean().optional(),
        autoCloseDaysOfInactivity: z.number().optional(),
        name: z.string().optional(),
        preferences: z
          .object({
            confetti: z.boolean().optional(),
            autoRespondEmailToChat: z.enum(["draft", "reply"]).nullable().optional(),
            disableTicketResponseTimeAlerts: z.boolean().optional(),
            disableNextTicketPreview: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const preferences = { ...ctx.mailbox.preferences, ...(input.preferences ?? {}) };
      await db
        .update(mailboxes)
        .set({ ...input, preferences })
        .where(eq(mailboxes.id, ctx.mailbox.id));
    }),

  getSessionsPaginated: mailboxProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        cursor: z.number().nullish(),
      }),
    )
    .query(async ({ input }) => {
      const { limit, cursor } = input;
      const page = cursor || 1;

      const result = await getGuideSessionsForMailbox(page, limit);
      const sessions = Array.isArray(result?.sessions) ? result.sessions : [];
      const totalCount = result?.totalCount ?? 0;

      const nextCursor = sessions.length === limit ? page + 1 : null;

      return {
        items: sessions,
        totalCount,
        nextCursor,
      };
    }),
  conversations: conversationsRouter,
  faqs: faqsRouter,
  members: membersRouter,
  slack: slackRouter,
  github: githubRouter,
  tools: toolsRouter,
  customers: customersRouter,
  websites: websitesRouter,
  savedReplies: savedRepliesRouter,
  issueGroups: issueGroupsRouter,

  autoClose: mailboxProcedure.mutation(async ({ ctx }) => {
    if (!ctx.mailbox.autoCloseEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Auto-close is not enabled for this mailbox",
      });
    }

    await triggerEvent("conversations/auto-close.check", {});

    return {
      success: true,
      message: "Auto-close job triggered successfully",
    };
  }),

  leaderboard: mailboxProcedure
    .input(
      z.object({
        days: z.number().min(1).max(365).default(7),
      }),
    )
    .query(async ({ input }) => {
      const stats = await getMemberStats({
        startDate: subDays(new Date(), input.days),
        endDate: new Date(),
      });

      return {
        leaderboard: stats.map((member) => ({
          userId: member.id,
          displayName: member.displayName || "Unknown",
          email: member.email,
          replyCount: member.replyCount,
        })),
      };
    }),
} satisfies TRPCRouterRecord;

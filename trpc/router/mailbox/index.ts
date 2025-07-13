import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, count, eq, isNotNull, isNull, SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { getLatestEvents } from "@/lib/data/dashboardEvent";
import { getGuideSessionsForMailbox } from "@/lib/data/guide";
import { getMailboxInfo } from "@/lib/data/mailbox";
import { conversationsRouter } from "./conversations/index";
import { customersRouter } from "./customers";
import { faqsRouter } from "./faqs";
import { githubRouter } from "./github";
import { membersRouter } from "./members";
import { metadataEndpointRouter } from "./metadataEndpoint";
import { mailboxProcedure } from "./procedure";
import { savedRepliesRouter } from "./savedReplies";
import { slackRouter } from "./slack";
import { toolsRouter } from "./tools";
import { websitesRouter } from "./websites";

export { mailboxProcedure };

export const mailboxRouter = {
  getCount: mailboxProcedure.query(async ({ ctx }) => {
    const countByStatus = async (status: "open" | "closed" | "spam", extraCondition?: SQL) => {
      const result = await db
        .select({ count: count() })
        .from(conversations)
        .where(
          and(eq(conversations.status, status), isNull(conversations.mergedIntoId), extraCondition),
        );
      return result[0]?.count ?? 0;
    };

    const [allOpen, myOpen, assignedOpen] = await Promise.all([
      countByStatus("open"),
      countByStatus("open", eq(conversations.assignedToId, ctx.user.id)),
      countByStatus("open", isNotNull(conversations.assignedToId)),
    ]);

    const [allClosed, myClosed, assignedClosed] = await Promise.all([
      countByStatus("closed"),
      countByStatus("closed", eq(conversations.assignedToId, ctx.user.id)),
      countByStatus("closed", isNotNull(conversations.assignedToId)),
    ]);

    const [allSpam, mySpam, assignedSpam] = await Promise.all([
      countByStatus("spam"),
      countByStatus("spam", eq(conversations.assignedToId, ctx.user.id)),
      countByStatus("spam", isNotNull(conversations.assignedToId)),
    ]);

    return {
      open: {
        conversations: allOpen,
        mine: myOpen,
        assigned: assignedOpen,
        unassigned: allOpen - assignedOpen,
      },
      closed: {
        conversations: allClosed,
        mine: myClosed,
        assigned: assignedClosed,
        unassigned: allClosed - assignedClosed,
      },
      spam: {
        conversations: allSpam,
        mine: mySpam,
        assigned: assignedSpam,
        unassigned: allSpam - assignedSpam,
      },
    };
  }),
  get: mailboxProcedure.query(async ({ ctx }) => {
    return await getMailboxInfo(ctx.mailbox);
  }),
  update: mailboxProcedure
    .input(
      z.object({
        slackAlertChannel: z.string().nullable().optional(),
        githubRepoOwner: z.string().optional(),
        githubRepoName: z.string().optional(),
        widgetDisplayMode: z.enum(["off", "always", "revenue_based"]).optional(),
        widgetDisplayMinValue: z.number().nullable().optional(),
        widgetHost: z.string().nullable().optional(),
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

  latestEvents: mailboxProcedure
    .input(z.object({ cursor: z.date().optional() }))
    .query(({ ctx, input }) => getLatestEvents(ctx.mailbox, input.cursor)),

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
  metadataEndpoint: metadataEndpointRouter,
  savedReplies: savedRepliesRouter,

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
} satisfies TRPCRouterRecord;

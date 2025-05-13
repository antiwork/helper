import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, count, eq, isNotNull, isNull, SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { setupMailboxForNewUser } from "@/lib/auth/authService";
import { getLatestEvents } from "@/lib/data/dashboardEvent";
import { getGuideSessionsForMailbox } from "@/lib/data/guide";
import { getMailboxInfo } from "@/lib/data/mailbox";
import { protectedProcedure } from "@/trpc/trpc";
import { conversationsRouter } from "./conversations/index";
import { customersRouter } from "./customers";
import { faqsRouter } from "./faqs";
import { githubRouter } from "./github";
import { membersRouter } from "./members";
import { metadataEndpointRouter } from "./metadataEndpoint";
import { preferencesRouter } from "./preferences";
import { mailboxProcedure } from "./procedure";
import { slackRouter } from "./slack";
import { toolsRouter } from "./tools";
import { websitesRouter } from "./websites";

export { mailboxProcedure };

export const mailboxRouter = {
  list: protectedProcedure.query(async ({ ctx }) => {
    const allMailboxes = await db.query.mailboxes.findMany({
      columns: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (allMailboxes.length === 0) {
      const mailbox = await setupMailboxForNewUser(ctx.user);
      allMailboxes.push(mailbox);
    }
    return allMailboxes;
  }),
  openCount: mailboxProcedure.query(async ({ ctx }) => {
    const countOpenStatus = async (where?: SQL) => {
      const result = await db
        .select({ count: count() })
        .from(conversations)
        .where(
          and(
            eq(conversations.mailboxId, ctx.mailbox.id),
            eq(conversations.status, "open"),
            isNull(conversations.mergedIntoId),
            where,
          ),
        );
      return result[0]?.count ?? 0;
    };

    const [all, mine, assigned] = await Promise.all([
      countOpenStatus(),
      countOpenStatus(eq(conversations.assignedToClerkId, ctx.user.id)),
      countOpenStatus(isNotNull(conversations.assignedToClerkId)),
    ]);

    return {
      conversations: all,
      mine,
      assigned,
      unassigned: all - assigned,
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
        autoRespondEmailToChat: z.boolean().optional(),
        widgetHost: z.string().nullable().optional(),
        vipThreshold: z.number().nullable().optional(),
        vipChannelId: z.string().nullable().optional(),
        vipExpectedResponseHours: z.number().nullable().optional(),
        autoCloseEnabled: z.boolean().optional(),
        autoCloseDaysOfInactivity: z.number().optional(),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.update(mailboxes).set(input).where(eq(mailboxes.id, ctx.mailbox.id));
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
    .query(async ({ ctx, input }) => {
      const { limit, cursor } = input;
      const { id: mailboxId } = ctx.mailbox;
      const page = cursor || 1;

      const result = await getGuideSessionsForMailbox(mailboxId, page, limit);
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
  autoClose: mailboxProcedure.mutation(async ({ ctx }) => {
    if (!ctx.mailbox.autoCloseEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Auto-close is not enabled for this mailbox",
      });
    }

    await inngest.send({
      name: "conversations/auto-close.check",
      data: {
        mailboxId: ctx.mailbox.id,
      },
    });

    return {
      success: true,
      message: "Auto-close job triggered successfully",
    };
  }),
  preferences: preferencesRouter,
} satisfies TRPCRouterRecord;

import { currentUser } from "@clerk/nextjs/server";
import { TRPCError, type TRPCRouterRecord } from "@trpc/server";
import { and, count, eq, isNotNull, isNull, SQL } from "drizzle-orm";
import { z } from "zod";
import { setupOrganizationForNewUser } from "@/auth/lib/authService";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { getLatestEvents } from "@/lib/data/dashboardEvent";
import { getMailboxInfo } from "@/lib/data/mailbox";
import { getClerkOrganization } from "@/lib/data/organization";
import { protectedProcedure } from "@/trpc/trpc";
import { conversationsRouter } from "./conversations/index";
import { customersRouter } from "./customers";
import { faqsRouter } from "./faqs";
import { githubRouter } from "./github";
import { membersRouter } from "./members";
import { metadataEndpointRouter } from "./metadataEndpoint";
import { mailboxProcedure } from "./procedure";
import { slackRouter } from "./slack";
import { toolsRouter } from "./tools";
import { websitesRouter } from "./websites";

export { mailboxProcedure };

export const mailboxRouter = {
  list: protectedProcedure.query(async ({ ctx }) => {
    const organization = await getClerkOrganization(ctx.session.orgId);
    const allMailboxes = await db.query.mailboxes.findMany({
      where: eq(mailboxes.clerkOrganizationId, organization.id),
      columns: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (allMailboxes.length === 0) {
      const mailbox = await setupOrganizationForNewUser(
        await getClerkOrganization(ctx.session.orgId),
        assertDefined(await currentUser()),
      );
      allMailboxes.push(mailbox);
    }
    return allMailboxes;
  }),
  countByStatus: mailboxProcedure.query(async ({ ctx }) => {
    const countByStatus = async (where?: SQL) => {
      const result = await db
        .select({ status: conversations.status, count: count() })
        .from(conversations)
        .where(and(eq(conversations.mailboxId, ctx.mailbox.id), isNull(conversations.mergedIntoId), where))
        .groupBy(conversations.status);
      return {
        open: result.find((c) => c.status === "open")?.count ?? 0,
        closed: result.find((c) => c.status === "closed")?.count ?? 0,
        spam: result.find((c) => c.status === "spam")?.count ?? 0,
      };
    };

    const [all, mine, assigned, unassigned] = await Promise.all([
      countByStatus(),
      countByStatus(eq(conversations.assignedToClerkId, ctx.session.userId)),
      countByStatus(isNotNull(conversations.assignedToClerkId)),
      countByStatus(isNull(conversations.assignedToClerkId)),
    ]);

    return {
      conversations: all,
      mine,
      assigned,
      unassigned,
    };
  }),
  get: mailboxProcedure.query(async ({ ctx }) => {
    return await getMailboxInfo(ctx.mailbox);
  }),
  update: mailboxProcedure
    .input(
      z.object({
        slackAlertChannel: z.string().optional(),
        githubRepoOwner: z.string().optional(),
        githubRepoName: z.string().optional(),
        widgetDisplayMode: z.enum(["off", "always", "revenue_based"]).optional(),
        widgetDisplayMinValue: z.number().optional(),
        autoRespondEmailToChat: z.boolean().optional(),
        widgetHost: z.string().optional(),
        vipThreshold: z.number().optional(),
        vipChannelId: z.string().optional(),
        vipExpectedResponseHours: z.number().optional(),
        disableAutoResponseForVips: z.boolean().optional(),
        autoCloseEnabled: z.boolean().optional(),
        autoCloseDaysOfInactivity: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await db.update(mailboxes).set(input).where(eq(mailboxes.id, ctx.mailbox.id));
    }),

  latestEvents: mailboxProcedure
    .input(z.object({ cursor: z.date().optional() }))
    .query(({ ctx, input }) => getLatestEvents(ctx.mailbox, input.cursor)),

  conversations: conversationsRouter,
  faqs: faqsRouter,
  members: membersRouter,
  slack: slackRouter,
  github: githubRouter,
  tools: toolsRouter,
  customers: customersRouter,
  websites: websitesRouter,
  metadataEndpoint: metadataEndpointRouter,
  autoClose: mailboxProcedure.input(z.object({ mailboxId: z.number() })).mutation(async ({ input }) => {
    const { mailboxId } = input;

    const mailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, mailboxId),
      columns: {
        id: true,
        autoCloseEnabled: true,
      },
    });

    if (!mailbox) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Mailbox not found" });
    }

    if (!mailbox.autoCloseEnabled) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Auto-close is not enabled for this mailbox",
      });
    }

    await inngest.send({
      name: "conversations/auto-close.check",
      data: {
        mailboxId: Number(mailboxId),
      },
    });

    return {
      success: true,
      message: "Auto-close job triggered successfully",
    };
  }),
} satisfies TRPCRouterRecord;

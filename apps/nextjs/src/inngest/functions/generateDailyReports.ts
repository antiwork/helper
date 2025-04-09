import { KnownBlock } from "@slack/web-api";
import { subHours } from "date-fns";
import { aliasedTable, and, eq, gt, isNotNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes, platformCustomers } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { postSlackMessage } from "@/lib/slack/client";

export const REPORT_HOUR = 11;
export const TIME_ZONE = "America/New_York";

export async function generateDailyReports() {
  const mailboxesList = await db.query.mailboxes.findMany({
    columns: { id: true },
    where: and(isNotNull(mailboxes.slackBotToken), isNotNull(mailboxes.slackAlertChannel)),
  });

  if (!mailboxesList.length) return;

  for (const mailbox of mailboxesList) {
    await inngest.send({
      name: "reports/daily",
      data: { mailboxId: mailbox.id },
    });
  }
}

export default inngest.createFunction(
  { id: "generate-daily-reports" },
  { cron: `TZ=${TIME_ZONE} 0 ${REPORT_HOUR} * * 0,2-6` },
  generateDailyReports,
);

export async function generateMailboxReport(mailboxId: number) {
  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.id, mailboxId),
  });
  if (!mailbox?.slackBotToken || !mailbox.slackAlertChannel) return;

  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "plain_text",
        text: `Daily summary for ${mailbox.name}:`,
        emoji: true,
      },
    },
  ];

  const endTime = new Date();
  const startTime = subHours(endTime, 24);

  const openTicketCount = await db.$count(
    conversations,
    and(
      eq(conversations.mailboxId, mailbox.id), 
      eq(conversations.status, "open"),
      isNull(conversations.mergedIntoId)
    ),
  );

  if (openTicketCount === 0) return { skipped: true, reason: "No open tickets" };

  const openCountMessage = `• Open tickets: ${openTicketCount.toLocaleString()}`;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const userMessages = aliasedTable(conversationMessages, "userMessages");
  const [avgReplyTimeResult] = await db
    .select({
      average: sql<number>`ROUND(AVG(
        EXTRACT(EPOCH FROM (${conversationMessages.createdAt} - ${userMessages.createdAt}))
      ))::integer`,
    })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .innerJoin(userMessages, and(eq(conversationMessages.responseToId, userMessages.id), eq(userMessages.role, "user")))
    .where(
      and(
        eq(conversations.mailboxId, mailbox.id),
        eq(conversationMessages.role, "staff"),
        gt(conversationMessages.createdAt, startTime),
        lt(conversationMessages.createdAt, endTime),
      ),
    );
  const avgReplyTimeMessage = avgReplyTimeResult?.average
    ? `• Average reply time: ${formatTime(avgReplyTimeResult.average)}`
    : null;

  let vipAvgReplyTimeMessage = null;
  if (mailbox.vipThreshold) {
    const [vipReplyTimeResult] = await db
      .select({
        average: sql<number>`ROUND(AVG(
          EXTRACT(EPOCH FROM (${conversationMessages.createdAt} - ${userMessages.createdAt}))
        ))::integer`,
      })
      .from(conversationMessages)
      .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
      .innerJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
      .innerJoin(
        userMessages,
        and(eq(conversationMessages.responseToId, userMessages.id), eq(userMessages.role, "user")),
      )
      .where(
        and(
          eq(conversations.mailboxId, mailbox.id),
          eq(conversationMessages.role, "staff"),
          gt(conversationMessages.createdAt, startTime),
          lt(conversationMessages.createdAt, endTime),
          gt(sql`CAST(${platformCustomers.value} AS INTEGER)`, (mailbox.vipThreshold ?? 0) * 100),
        ),
      );
    vipAvgReplyTimeMessage = vipReplyTimeResult?.average
      ? `• VIP average reply time: ${formatTime(vipReplyTimeResult.average)}`
      : null;
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      text: [openCountMessage, avgReplyTimeMessage, vipAvgReplyTimeMessage].filter(Boolean).join("\n"),
    },
  });

  await postSlackMessage(mailbox.slackBotToken, {
    channel: mailbox.slackAlertChannel,
    text: `Daily summary for ${mailbox.name}`,
    blocks,
  });

  return {
    success: true,
    openCountMessage,
    avgReplyTimeMessage,
    vipAvgReplyTimeMessage,
  };
}

export const generateMailboxDailyReport = inngest.createFunction(
  { id: "generate-daily-report-mailbox" },
  { event: "reports/daily" },
  ({ event }) => {
    return generateMailboxReport(event.data.mailboxId);
  },
);

import { subHours } from "date-fns";
import { aliasedTable, and, eq, gt, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes, platformCustomers } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { sendDailyReportEmail } from "@/lib/email/notifications";

export const TIME_ZONE = "America/New_York";

export async function generateDailyReports() {
  const mailboxesList = await db.query.mailboxes.findMany({
    columns: { id: true },
  });

  if (!mailboxesList.length) return;

  await triggerEvent("reports/daily", {});
}

export async function generateMailboxDailyReport() {
  const mailbox = await getMailbox();
  if (!mailbox) return;

  const endTime = new Date();
  const startTime = subHours(endTime, 24);

  const openTicketCount = await db.$count(
    conversations,
    and(eq(conversations.status, "open"), isNull(conversations.mergedIntoId)),
  );

  if (openTicketCount === 0) return { skipped: true, reason: "No open tickets" };

  const openCountMessage = `• Open tickets: ${openTicketCount.toLocaleString()}`;

  const answeredTicketCount = await db
    .select({ count: sql`count(DISTINCT ${conversations.id})` })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .where(
      and(
        eq(conversationMessages.role, "staff"),
        gt(conversationMessages.createdAt, startTime),
        lt(conversationMessages.createdAt, endTime),
        isNull(conversations.mergedIntoId),
      ),
    )
    .then((result) => Number(result[0]?.count || 0));

  const answeredCountMessage = `• Tickets answered: ${answeredTicketCount.toLocaleString()}`;

  const openTicketsOverZeroCount = await db
    .select({ count: sql`count(*)` })
    .from(conversations)
    .leftJoin(platformCustomers, and(eq(conversations.emailFrom, platformCustomers.email)))
    .where(
      and(
        eq(conversations.status, "open"),
        isNull(conversations.mergedIntoId),
        gt(sql`CAST(${platformCustomers.value} AS INTEGER)`, 0),
      ),
    )
    .then((result) => Number(result[0]?.count || 0));

  const openTicketsOverZeroMessage = openTicketsOverZeroCount
    ? `• Open tickets over $0: ${openTicketsOverZeroCount.toLocaleString()}`
    : null;

  const answeredTicketsOverZeroCount = await db
    .select({ count: sql`count(DISTINCT ${conversations.id})` })
    .from(conversationMessages)
    .innerJoin(conversations, eq(conversationMessages.conversationId, conversations.id))
    .leftJoin(platformCustomers, and(eq(conversations.emailFrom, platformCustomers.email)))
    .where(
      and(
        eq(conversationMessages.role, "staff"),
        gt(conversationMessages.createdAt, startTime),
        lt(conversationMessages.createdAt, endTime),
        isNull(conversations.mergedIntoId),
        gt(sql`CAST(${platformCustomers.value} AS INTEGER)`, 0),
      ),
    )
    .then((result) => Number(result[0]?.count || 0));

  const answeredTicketsOverZeroMessage = answeredTicketsOverZeroCount
    ? `• Tickets answered over $0: ${answeredTicketsOverZeroCount.toLocaleString()}`
    : null;

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
        eq(conversationMessages.role, "staff"),
        gt(conversationMessages.createdAt, startTime),
        lt(conversationMessages.createdAt, endTime),
      ),
    );
  let vipReplyTimeResult: { average: number } | undefined;
  if (mailbox.vipThreshold) {
    const [result] = await db
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
          eq(conversationMessages.role, "staff"),
          gt(conversationMessages.createdAt, startTime),
          lt(conversationMessages.createdAt, endTime),
          gt(sql`CAST(${platformCustomers.value} AS INTEGER)`, (mailbox.vipThreshold ?? 0) * 100),
        ),
      );
    vipReplyTimeResult = result;
  }

  const [avgWaitTimeResult] = await db
    .select({
      average: sql<number>`ROUND(AVG(
        EXTRACT(EPOCH FROM (${endTime.toISOString()}::timestamp - ${conversations.lastUserEmailCreatedAt}))
      ))::integer`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.status, "open"),
        isNull(conversations.mergedIntoId),
        isNotNull(conversations.lastUserEmailCreatedAt),
      ),
    );
  const avgWaitTimeMessage = avgWaitTimeResult?.average
    ? formatTime(avgWaitTimeResult.average)
    : undefined;

  const result = await sendDailyReportEmail({
    mailboxName: mailbox.name,
    openTickets: openTicketCount,
    ticketsAnswered: answeredTicketCount,
    openTicketsOverZero: openTicketsOverZeroCount > 0 ? openTicketsOverZeroCount : undefined,
    ticketsAnsweredOverZero: answeredTicketsOverZeroCount > 0 ? answeredTicketsOverZeroCount : undefined,
    averageReplyTime: avgReplyTimeResult?.average ? formatTime(avgReplyTimeResult.average) : undefined,
    vipAverageReplyTime: vipReplyTimeResult?.average ? formatTime(vipReplyTimeResult.average) : undefined,
    averageWaitTime: avgWaitTimeMessage,
  });

  if (!result || !("sentTo" in result)) {
    return {
      success: false,
      sentTo: 0,
      openTickets: openTicketCount,
      ticketsAnswered: answeredTicketCount,
    };
  }

  return {
    success: result.success,
    sentTo: result.sentTo,
    openTickets: openTicketCount,
    ticketsAnswered: answeredTicketCount,
  };
}

import { subHours } from "date-fns";
import { aliasedTable, and, eq, gt, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes, platformCustomers, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { triggerEvent } from "@/jobs/trigger";
import { DailyEmailReportTemplate } from "@/lib/emails/dailyEmailReportTemplate";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const TIME_ZONE = "America/New_York";

export async function generateDailyEmailReports() {
  const mailboxesList = await db.query.mailboxes.findMany({
    columns: { id: true },
  });

  if (!mailboxesList.length) return;

  await triggerEvent("reports/daily", {});
}

export async function generateMailboxDailyEmailReport() {
  const mailbox = await db.query.mailboxes.findFirst({
    where: isNull(sql`${mailboxes.preferences}->>'disabled'`),
  });
  if (!mailbox) return;

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
    return { skipped: true, reason: "Email not configured" };
  }

  const endTime = new Date();
  const startTime = subHours(endTime, 24);

  const openTicketCount = await db.$count(
    conversations,
    and(eq(conversations.status, "open"), isNull(conversations.mergedIntoId)),
  );

  if (openTicketCount === 0) return { skipped: true, reason: "No open tickets" };

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
  const avgWaitTimeMessage = avgWaitTimeResult?.average ? formatTime(avgWaitTimeResult.average) : undefined;

  const teamMembers = await db
    .select({
      email: authUsers.email,
      displayName: userProfiles.displayName,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
    .where(or(isNull(userProfiles.preferences), sql`${userProfiles.preferences}->>'allowDailyEmail' != 'false'`));

  if (teamMembers.length === 0) {
    return { skipped: true, reason: "No team members found" };
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const emailPromises = teamMembers.map(async (member) => {
    if (!member.email) return { success: false, reason: "No email address" };

    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: member.email,
        subject: `Daily summary for ${mailbox.name}`,
        react: DailyEmailReportTemplate({
          mailboxName: mailbox.name,
          openTickets: openTicketCount,
          ticketsAnswered: answeredTicketCount,
          openTicketsOverZero: openTicketsOverZeroCount || undefined,
          ticketsAnsweredOverZero: answeredTicketsOverZeroCount || undefined,
          avgReplyTime: avgReplyTimeResult?.average ? formatTime(avgReplyTimeResult.average) : undefined,
          vipAvgReplyTime: vipAvgReplyTimeMessage
            ? vipAvgReplyTimeMessage.replace("• VIP average reply time: ", "")
            : undefined,
          avgWaitTime: avgWaitTimeMessage,
        }),
      });

      return { success: true };
    } catch (error) {
      captureExceptionAndLog(error);
      return { success: false, error };
    }
  });

  const emailResults = await Promise.all(emailPromises);

  return {
    success: true,
    emailsSent: emailResults.filter((r) => r.success).length,
    totalRecipients: teamMembers.length,
  };
}

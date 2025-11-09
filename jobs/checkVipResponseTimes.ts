import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, mailboxes, platformCustomers } from "@/db/schema";
import { formatDuration } from "@/jobs/checkAssignedTicketResponseTimes";
import { sendResponseTimeAlertEmail } from "@/lib/email/notifications";

export const checkVipResponseTimes = async () => {
  const mailboxesList = await db.query.mailboxes.findMany({
    where: and(isNotNull(mailboxes.vipThreshold), isNotNull(mailboxes.vipExpectedResponseHours)),
  });

  if (!mailboxesList.length) return;

  for (const mailbox of mailboxesList) {
    const overdueVipConversations = await db
      .select({
        name: platformCustomers.name,
        subject: conversations.subject,
        slug: conversations.slug,
        lastUserEmailCreatedAt: conversations.lastUserEmailCreatedAt,
      })
      .from(conversations)
      .innerJoin(platformCustomers, eq(conversations.emailFrom, platformCustomers.email))
      .where(
        and(
          isNull(conversations.assignedToId),
          isNull(conversations.mergedIntoId),
          eq(conversations.status, "open"),
          gt(
            sql`EXTRACT(EPOCH FROM (NOW() - ${conversations.lastUserEmailCreatedAt})) / 3600`,
            mailbox.vipExpectedResponseHours!,
          ),
          gt(sql`CAST(${platformCustomers.value} AS INTEGER)`, (mailbox.vipThreshold ?? 0) * 100),
        ),
      )
      .orderBy(desc(conversations.lastUserEmailCreatedAt));

    if (!overdueVipConversations.length) continue;

    const tickets = overdueVipConversations.slice(0, 10).map((conversation) => ({
      subject: conversation.subject?.replace(/\|<>/g, "") ?? "No subject",
      slug: conversation.slug,
      timeSinceLastReply: formatDuration(conversation.lastUserEmailCreatedAt!),
    }));

    const threshold = `${mailbox.vipExpectedResponseHours ?? 0} ${mailbox.vipExpectedResponseHours === 1 ? "hour" : "hours"}`;

    await sendResponseTimeAlertEmail({
      alertType: "vip",
      mailboxName: mailbox.name,
      overdueCount: overdueVipConversations.length,
      tickets,
      threshold,
    });
  }

  return { success: true };
};

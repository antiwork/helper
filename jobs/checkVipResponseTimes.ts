import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations, mailboxes, platformCustomers } from "@/db/schema";
import { formatDuration } from "@/jobs/checkAssignedTicketResponseTimes";
import { postGoogleChatWebhookMessage } from "@/lib/googleChat/webhook";

export const checkVipResponseTimes = async () => {
  const mailboxesList = await db.query.mailboxes.findMany({
    where: and(
      isNotNull(mailboxes.vipThreshold),
      isNotNull(mailboxes.vipExpectedResponseHours),
      isNotNull(mailboxes.googleChatWebhookUrl),
    ),
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

    const hourLabel = mailbox.vipExpectedResponseHours === 1 ? "hour" : "hours";
    const vipLabel = overdueVipConversations.length === 1 ? "VIP" : "VIPs";
    const verb = overdueVipConversations.length === 1 ? "has" : "have";

    const lines = [
      `VIP response time alert for ${mailbox.name}`,
      `${overdueVipConversations.length} ${vipLabel} ${verb} been waiting over ${mailbox.vipExpectedResponseHours ?? 0} ${hourLabel}`,
      "",
      ...overdueVipConversations.slice(0, 10).map((conversation) => {
        const subject = conversation.subject?.replace(/\|<>/g, "") ?? "No subject";
        const customerName = conversation.name ?? "Unknown";
        const duration = formatDuration(conversation.lastUserEmailCreatedAt!);
        return `• ${subject} - ${getBaseUrl()}/conversations?id=${conversation.slug} (${customerName}, ${duration} since last reply)`;
      }),
      ...(overdueVipConversations.length > 10 ? [`(and ${overdueVipConversations.length - 10} more)`] : []),
    ];

    await postGoogleChatWebhookMessage(mailbox.googleChatWebhookUrl!, { text: lines.join("\n") });
  }

  return { success: true };
};

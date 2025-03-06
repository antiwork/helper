import { KnownBlock } from "@slack/web-api";
import { intervalToDuration } from "date-fns";
import { and, desc, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations, mailboxes, platformCustomers } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { postSlackMessage } from "@/lib/slack/client";

function formatDuration(start: Date): string {
  const duration = intervalToDuration({ start, end: new Date() });

  const parts: string[] = [];

  if (duration.days && duration.days > 0) {
    parts.push(`${duration.days} ${duration.days === 1 ? "day" : "days"}`);
  }

  if (duration.hours && duration.hours > 0) {
    parts.push(`${duration.hours} ${duration.hours === 1 ? "hour" : "hours"}`);
  }

  if (duration.minutes && duration.minutes > 0) {
    parts.push(`${duration.minutes} ${duration.minutes === 1 ? "minute" : "minutes"}`);
  }

  return parts.join(" ");
}

export default inngest.createFunction(
  { id: "check-vip-response-times" },
  { cron: "0 * * * *" }, // Run every hour
  async () => {
    const mailboxesList = await db.query.mailboxes.findMany({
      where: and(
        isNotNull(mailboxes.vipThreshold),
        isNotNull(mailboxes.vipExpectedResponseHours),
        isNotNull(mailboxes.vipChannelId),
        isNotNull(mailboxes.slackBotToken),
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
            eq(conversations.mailboxId, mailbox.id),
            isNull(conversations.assignedToClerkId),
            inArray(conversations.status, ["open", "escalated"]),
            gt(
              sql`EXTRACT(EPOCH FROM (NOW() - ${conversations.lastUserEmailCreatedAt})) / 3600`,
              mailbox.vipExpectedResponseHours!,
            ),
            gt(sql`CAST(${platformCustomers.value} AS INTEGER)`, (mailbox.vipThreshold ?? 0) * 100),
          ),
        )
        .orderBy(desc(conversations.lastUserEmailCreatedAt));

      if (!overdueVipConversations.length) continue;

      const blocks: KnownBlock[] = [
        {
          type: "section" as const,
          text: {
            type: "mrkdwn",
            text: [
              `🚨 *${overdueVipConversations.length} VIPs have been waiting over ${
                mailbox.vipExpectedResponseHours ?? 0
              } ${mailbox.vipExpectedResponseHours === 1 ? "hour" : "hours"}*\n`,
              ...overdueVipConversations
                .slice(0, 10)
                .map(
                  (conversation) =>
                    `• <${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}|${conversation.subject?.replace(/\|<>/g, "") ?? "No subject"}> (${conversation.name}, ${formatDuration(conversation.lastUserEmailCreatedAt!)} since last reply)`,
                ),
              ...(overdueVipConversations.length > 10 ? [`(and ${overdueVipConversations.length - 10} more)`] : []),
            ].join("\n"),
          },
        },
      ];

      await postSlackMessage(mailbox.slackBotToken!, {
        channel: mailbox.vipChannelId!,
        text: `VIP Response Time Alert for ${mailbox.name}`,
        blocks,
      });
    }

    return { success: true };
  },
);

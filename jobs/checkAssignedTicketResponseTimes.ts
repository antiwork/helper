import { KnownBlock } from "@slack/web-api";
import { intervalToDuration, isWeekend } from "date-fns";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { getSlackUsersByEmail, postSlackMessage } from "@/lib/slack/client";

export function formatDuration(start: Date): string {
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

export const checkAssignedTicketResponseTimes = async () => {
  if (isWeekend(new Date())) return { success: true, skipped: "weekend" };

  const mailboxesList = await db.query.mailboxes.findMany({
    where: and(isNotNull(mailboxes.slackBotToken), isNotNull(mailboxes.slackAlertChannel)),
  });

  if (!mailboxesList.length) return;

  const failedMailboxes: { id: number; name: string; slug: string; error: string }[] = [];

  const usersById = Object.fromEntries((await db.query.authUsers.findMany()).map((user) => [user.id, user]));

  for (const mailbox of mailboxesList) {
    if (mailbox.preferences?.disableTicketResponseTimeAlerts) continue;
    try {
      const overdueAssignedConversations = await db
        .select({
          subject: conversations.subject,
          slug: conversations.slug,
          assignedToId: conversations.assignedToId,
          lastUserEmailCreatedAt: conversations.lastUserEmailCreatedAt,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.unused_mailboxId, mailbox.id),
            isNotNull(conversations.assignedToId),
            isNull(conversations.mergedIntoId),
            eq(conversations.status, "open"),
            gt(
              sql`EXTRACT(EPOCH FROM (${new Date()} - ${conversations.lastUserEmailCreatedAt})) / 3600`,
              24, // 24 hours threshold
            ),
          ),
        )
        .orderBy(desc(conversations.lastUserEmailCreatedAt));

      if (!overdueAssignedConversations.length) continue;

      const slackUsersByEmail = await getSlackUsersByEmail(mailbox.slackBotToken!);

      const blocks: KnownBlock[] = [
        {
          type: "section" as const,
          text: {
            type: "mrkdwn",
            text: [
              `🚨 *${overdueAssignedConversations.length} assigned tickets have been waiting over 24 hours without a response*\n`,
              ...overdueAssignedConversations.slice(0, 10).map((conversation) => {
                const subject = conversation.subject;
                const assignee = usersById[conversation.assignedToId!];
                const assigneeEmail = assignee?.email;
                const slackUserId = assigneeEmail ? slackUsersByEmail.get(assigneeEmail) : undefined;
                const mention = slackUserId
                  ? `<@${slackUserId}>`
                  : assignee?.user_metadata?.display_name || assignee?.email || "Unknown";
                const timeSinceLastReply = formatDuration(conversation.lastUserEmailCreatedAt!);
                return `• <${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}|${subject?.replace(/\|<>/g, "") ?? "No subject"}> (Assigned to ${mention}, ${timeSinceLastReply} since last reply)`;
              }),
              ...(overdueAssignedConversations.length > 10
                ? [`(and ${overdueAssignedConversations.length - 10} more)`]
                : []),
            ].join("\n"),
          },
        },
      ];

      await postSlackMessage(mailbox.slackBotToken!, {
        channel: mailbox.slackAlertChannel!,
        text: `Assigned Ticket Response Time Alert for ${mailbox.name}`,
        blocks,
      });
    } catch (error) {
      failedMailboxes.push({
        id: mailbox.id,
        name: mailbox.name,
        slug: mailbox.slug,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    success: failedMailboxes.length === 0,
    failedMailboxes,
  };
};

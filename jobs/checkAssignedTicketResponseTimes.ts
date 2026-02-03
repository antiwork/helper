import { intervalToDuration, isWeekend } from "date-fns";
import { and, desc, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getMailbox } from "@/lib/data/mailbox";
import { postGoogleChatWebhookMessage } from "@/lib/googleChat/webhook";

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

export const checkAssignedTicketResponseTimes = async (now = new Date()) => {
  if (isWeekend(now)) return { success: true, skipped: "weekend" };

  const mailbox = await getMailbox();
  if (!mailbox?.googleChatWebhookUrl) return;

  const failedMailboxes: { id: number; name: string; slug: string; error: string }[] = [];

  const users = await db
    .select({
      id: userProfiles.id,
      displayName: userProfiles.displayName,
      email: authUsers.email,
      permissions: userProfiles.permissions,
      access: userProfiles.access,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id));

  const usersById = Object.fromEntries(users.map((user) => [user.id, user]));

  if (mailbox.preferences?.disableTicketResponseTimeAlerts) return { success: true, skipped: "disabled" };

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
          isNotNull(conversations.assignedToId),
          isNull(conversations.mergedIntoId),
          eq(conversations.status, "open"),
          gt(
            sql`EXTRACT(EPOCH FROM (${now.toISOString()}::timestamp - ${conversations.lastUserEmailCreatedAt})) / 3600`,
            24, // 24 hours threshold
          ),
        ),
      )
      .orderBy(desc(conversations.lastUserEmailCreatedAt));

    if (!overdueAssignedConversations.length) return { success: true, skipped: "no_overdue" };

    const lines = [
      `Assigned ticket response time alert for ${mailbox.name}`,
      `${overdueAssignedConversations.length} assigned tickets have been waiting over 24 hours without a response`,
      "",
      ...overdueAssignedConversations.slice(0, 10).map((conversation) => {
        const subject = conversation.subject?.replace(/\|<>/g, "") ?? "No subject";
        const assignee = usersById[conversation.assignedToId!];
        const assigneeName = assignee?.displayName || assignee?.email || "Unknown";
        const timeSinceLastReply = formatDuration(conversation.lastUserEmailCreatedAt!);
        return `• ${subject} - ${getBaseUrl()}/conversations?id=${conversation.slug} (Assigned to ${assigneeName}, ${timeSinceLastReply} since last reply)`;
      }),
      ...(overdueAssignedConversations.length > 10 ? [`(and ${overdueAssignedConversations.length - 10} more)`] : []),
    ];

    await postGoogleChatWebhookMessage(mailbox.googleChatWebhookUrl, { text: lines.join("\n") });
  } catch (error) {
    failedMailboxes.push({
      id: mailbox.id,
      name: mailbox.name,
      slug: mailbox.slug,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    success: failedMailboxes.length === 0,
    failedMailboxes,
  };
};

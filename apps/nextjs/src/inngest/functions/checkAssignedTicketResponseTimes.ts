import { KnownBlock } from "@slack/web-api";
import { isWeekend } from "date-fns";
import { and, desc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { getOrganizationMembers } from "@/lib/data/organization";
import { postSlackMessage } from "@/lib/slack/client";

export default inngest.createFunction(
  { id: "check-assigned-ticket-response-times" },
  { cron: "0 * * * *" }, // Run every hour
  async () => {
    const mailboxesList = await db.query.mailboxes.findMany({
      where: and(isNotNull(mailboxes.slackBotToken), isNotNull(mailboxes.slackEscalationChannel)),
    });

    if (!mailboxesList.length) return;

    for (const mailbox of mailboxesList) {
      const overdueAssignedConversations = await db
        .select({
          subject: conversations.subject,
          slug: conversations.slug,
          assignedToClerkId: conversations.assignedToClerkId,
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.mailboxId, mailbox.id),
            isNotNull(conversations.assignedToClerkId),
            inArray(conversations.status, ["open", "escalated"]),
            gt(
              sql`EXTRACT(EPOCH FROM (NOW() - ${conversations.lastUserEmailCreatedAt})) / 3600`,
              24, // 24 hours threshold
            ),
          ),
        )
        .orderBy(desc(conversations.lastUserEmailCreatedAt));

      if (!overdueAssignedConversations.length) continue;

      // Get organization members to display assignee names
      const orgMembers = await getOrganizationMembers(mailbox.clerkOrganizationId);

      const blocks: KnownBlock[] = [
        {
          type: "section" as const,
          text: {
            type: "mrkdwn",
            text: [
              `🚨 *${overdueAssignedConversations.length} assigned tickets have been waiting over 24 hours without a response*\n`,
              ...overdueAssignedConversations.slice(0, 10).map((conversation) => {
                const subject = conversation.subject;
                const assigneeName =
                  orgMembers.data.find((m) => m.publicUserData?.userId === conversation.assignedToClerkId)
                    ?.publicUserData?.firstName || "Unknown";
                return `• <${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}|${subject?.replace(/\|<>/g, "") ?? "No subject"}> (Assigned to: ${assigneeName})`;
              }),
              ...(overdueAssignedConversations.length > 10
                ? [`(and ${overdueAssignedConversations.length - 10} more)`]
                : []),
            ].join("\n"),
          },
        },
      ];

      // Don't send alerts during weekends for Gumroad
      const now = new Date();
      if (!isWeekend(now) || mailbox.name !== "Gumroad") {
        await postSlackMessage(mailbox.slackBotToken!, {
          channel: mailbox.slackEscalationChannel!,
          text: `Assigned Ticket Response Time Alert for ${mailbox.name}`,
          blocks,
        });
      }
    }

    return { success: true };
  },
);

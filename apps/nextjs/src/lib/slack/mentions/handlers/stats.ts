import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { postSlackMessage } from "../../client";
import { SlackUser } from "../types";

export const handleStatsRequest = async (
  text: string,
  user: SlackUser,
  channelId: string,
  messageTs: string,
  mailbox: { id: number; slackBotToken: string },
) => {
  try {
    // Extract time period from the text
    let hoursAgo = 24; // Default to 24 hours

    const dayMatch = /(\d+)\s+days?/i.exec(text);
    const hourMatch = /(\d+)\s+hours?/i.exec(text);

    if (dayMatch?.[1]) {
      hoursAgo = parseInt(dayMatch[1]) * 24;
    } else if (hourMatch?.[1]) {
      hoursAgo = parseInt(hourMatch[1]);
    }

    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);

    const [totalAnswered] = await db
      .select({ count: count() })
      .from(conversationMessages)
      .where(
        and(
          eq(conversationMessages.clerkUserId, user.id),
          // @ts-expect-error - Type issue with the role field
          eq(conversationMessages.role, "agent"),
          gt(conversationMessages.createdAt, cutoffDate),
        ),
      );

    const [openTickets] = await db
      .select({ count: count() })
      .from(conversations)
      .where(and(eq(conversations.mailboxId, mailbox.id), eq(conversations.status, "open")));

    const [closedTickets] = await db
      .select({ count: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.mailboxId, mailbox.id),
          eq(conversations.status, "closed"),
          gt(conversations.closedAt, cutoffDate),
        ),
      );

    // Format time period for display
    let timePeriod = `${hoursAgo} hours`;
    if (hoursAgo >= 24 && hoursAgo % 24 === 0) {
      const days = hoursAgo / 24;
      timePeriod = `${days} day${days > 1 ? "s" : ""}`;
    }

    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `Stats for the last ${timePeriod}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Tickets you answered:* ${totalAnswered?.count || 0}`,
            },
            {
              type: "mrkdwn",
              text: `*Open tickets:* ${openTickets?.count || 0}`,
            },
            {
              type: "mrkdwn",
              text: `*Tickets closed:* ${closedTickets?.count || 0}`,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error in handleStatsRequest:", error);
    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      text: "An error occurred while retrieving statistics. Please try again.",
    });
  }
};

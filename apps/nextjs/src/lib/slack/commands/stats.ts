import { and, count, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { sendSlackResponse } from "./response";
import { CommandArgs, SlackUser } from "./types";

export const handleStatsCommand = async (
  args: CommandArgs,
  user: SlackUser,
  channelId: string,
  responseUrl: string,
  mailbox: { id: number },
) => {
  const timeframe = args.timeframe || args.search || "24h";
  let hoursAgo = 24;

  if (timeframe.endsWith("h")) {
    hoursAgo = parseInt(timeframe.slice(0, -1)) || 24;
  } else if (timeframe.endsWith("d")) {
    hoursAgo = parseInt(timeframe.slice(0, -1)) * 24 || 24;
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

  await sendSlackResponse(responseUrl, {
    response_type: "ephemeral",
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `Stats for the last ${timeframe}`,
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
};

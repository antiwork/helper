import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { env } from "@/env";
import { updateConversation } from "@/lib/data/conversation";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { postSlackMessage } from "../../client";
import { SlackUser } from "../types";

export const handleAssignRequest = async (
  text: string,
  user: SlackUser,
  channelId: string,
  messageTs: string,
  mailbox: { id: number; slug: string; slackBotToken: string },
) => {
  try {
    // Extract the number of tickets requested and search terms
    const countMatch = /(\d+)\s+tickets?/i.exec(text);
    const requestedCount = countMatch?.[1] ? parseInt(countMatch[1]) : 1;
    const count = Math.min(requestedCount, 5); // Limit to 5 tickets max

    // Extract search terms by removing common phrases
    const searchTerm = text
      .replace(/give me/i, "")
      .replace(/assign/i, "")
      .replace(/find/i, "")
      .replace(/get/i, "")
      .replace(/\d+\s+tickets?/i, "")
      .replace(/tickets?/i, "")
      .replace(/to respond to/i, "")
      .replace(/about/i, "")
      .replace(/regarding/i, "")
      .trim();

    let tickets: (typeof conversations.$inferSelect)[] = [];

    if (searchTerm) {
      // Use the searchEmailsByKeywords function for searching in encrypted content
      const matches = await searchEmailsByKeywords(searchTerm, mailbox.id);

      if (matches.length > 0) {
        tickets = await db
          .select()
          .from(conversations)
          .where(
            and(
              eq(conversations.mailboxId, mailbox.id),
              eq(conversations.status, "open"),
              inArray(
                conversations.id,
                matches.map((m) => m.conversationId),
              ),
            ),
          )
          .orderBy(desc(conversations.createdAt))
          .limit(count);
      }
    } else {
      // If no search term, just get the most recent open tickets
      tickets = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.mailboxId, mailbox.id), eq(conversations.status, "open")))
        .orderBy(desc(conversations.createdAt))
        .limit(count);
    }

    if (tickets.length === 0) {
      await postSlackMessage(mailbox.slackBotToken, {
        channel: channelId,
        thread_ts: messageTs,
        text: searchTerm ? `No open tickets found matching "${searchTerm}".` : "No open tickets found.",
      });
      return;
    }

    // Assign the tickets to the user
    for (const ticket of tickets) {
      await db.transaction(async (tx) => {
        await updateConversation(
          ticket.id,
          {
            set: { assignedToClerkId: user.id },
            byUserId: user.id,
            message: "Assigned via Slack mention",
          },
          tx,
        );
      });
    }

    // Format the response
    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${tickets.length} ticket${tickets.length > 1 ? "s" : ""} assigned to you:*`,
        },
      },
    ];

    for (const ticket of tickets) {
      const ticketUrl = `${env.AUTH_URL}/mailboxes/${mailbox.slug}/conversations?id=${ticket.slug}`;

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${ticket.subject}*\nFrom: ${ticket.emailFromName || ticket.emailFrom} | ${new Date(ticket.createdAt).toLocaleString()}`,
        },
      });

      blocks.push({
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "View Ticket",
            },
            url: ticketUrl,
          },
        ],
      });
    }

    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      blocks,
    });
  } catch (error) {
    console.error("Error in handleAssignRequest:", error);
    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      text: "An error occurred while searching for tickets. Please try again.",
    });
  }
};

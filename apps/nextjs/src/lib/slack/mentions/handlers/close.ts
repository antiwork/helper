import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { postSlackMessage } from "../../client";
import { SlackUser } from "../types";

export const handleCloseRequest = async (
  text: string,
  user: SlackUser,
  channelId: string,
  messageTs: string,
  mailbox: { id: number; slackBotToken: string },
) => {
  try {
    // Extract days from text (e.g., "older than 30 days")
    const daysMatch = /older than (\d+) days?/i.exec(text) || /(\d+) days? old/i.exec(text);
    const daysAgo = daysMatch?.[1] ? parseInt(daysMatch[1]) : 30; // Default to 30 days if not specified

    // Extract search terms
    let searchTerm = "";
    const aboutMatch = /about\s+(.+?)(?:\s+older|\s+$)/i.exec(text) || /regarding\s+(.+?)(?:\s+older|\s+$)/i.exec(text);
    if (aboutMatch?.[1]) {
      searchTerm = aboutMatch[1].trim();
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    // Build the query conditions
    const baseConditions = [eq(conversations.mailboxId, mailbox.id), eq(conversations.status, "open")];

    if (daysMatch) {
      baseConditions.push(lt(conversations.createdAt, cutoffDate));
    }

    let matchingTickets: (typeof conversations.$inferSelect)[] = [];

    // If search term is provided, use searchEmailsByKeywords for encrypted content
    if (searchTerm) {
      const matches = await searchEmailsByKeywords(searchTerm, mailbox.id);

      if (matches.length > 0) {
        matchingTickets = await db
          .select()
          .from(conversations)
          .where(
            and(
              ...baseConditions,
              inArray(
                conversations.id,
                matches.map((m) => m.conversationId),
              ),
            ),
          );
      }
    } else {
      matchingTickets = await db
        .select()
        .from(conversations)
        .where(and(...baseConditions));
    }

    if (matchingTickets.length === 0) {
      await postSlackMessage(mailbox.slackBotToken, {
        channel: channelId,
        thread_ts: messageTs,
        text: "No matching tickets found to close.",
      });
      return;
    }

    // Confirm with the user before closing tickets
    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `You are about to close *${matchingTickets.length}* tickets${searchTerm ? ` about "${searchTerm}"` : ""}${daysMatch ? ` that are older than ${daysAgo} days` : ""}. Are you sure?`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Yes, close them",
              },
              style: "danger",
              action_id: "bulk_close_confirm",
              value: JSON.stringify({
                daysAgo,
                searchTerm,
                mailboxId: mailbox.id,
                userId: user.id,
                channelId,
                messageTs,
              }),
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Cancel",
              },
              action_id: "bulk_close_cancel",
            },
          ],
        } as any,
      ],
    });
  } catch (error) {
    console.error("Error in handleCloseRequest:", error);
    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      text: "An error occurred while searching for tickets. Please try again.",
    });
  }
};

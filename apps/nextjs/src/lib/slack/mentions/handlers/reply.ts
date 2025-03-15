import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { postSlackMessage } from "../../client";
import { SlackUser } from "../types";

export const handleReplyRequest = async (
  text: string,
  user: SlackUser,
  channelId: string,
  messageTs: string,
  mailbox: { id: number; slackBotToken: string },
) => {
  try {
    // Extract the message to send
    const messageMatch = /saying\s+(.+?)$/i.exec(text) || /with\s+(.+?)$/i.exec(text);
    const message = messageMatch?.[1] ? messageMatch[1].trim() : "";

    if (!message) {
      await postSlackMessage(mailbox.slackBotToken, {
        channel: channelId,
        thread_ts: messageTs,
        text: "Please specify a message to send. For example: '@helpme reply to all tickets about verification saying This issue has been resolved!'",
      });
      return;
    }

    // Extract search terms
    let searchTerm = "";
    const aboutMatch =
      /about\s+(.+?)(?:\s+saying|\s+with|\s+$)/i.exec(text) ||
      /regarding\s+(.+?)(?:\s+saying|\s+with|\s+$)/i.exec(text);

    if (aboutMatch?.[1]) {
      searchTerm = aboutMatch[1].trim();
    }

    const conditions = [eq(conversations.mailboxId, mailbox.id), eq(conversations.status, "open")];
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
              ...conditions,
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
        .where(and(...conditions));
    }

    if (matchingTickets.length === 0) {
      await postSlackMessage(mailbox.slackBotToken, {
        channel: channelId,
        thread_ts: messageTs,
        text: "No matching tickets found to reply to.",
      });
      return;
    }

    // Confirm with the user before sending replies
    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `You are about to reply to *${matchingTickets.length}* tickets${searchTerm ? ` about "${searchTerm}"` : ""} with the following message:`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `> ${message}`,
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Yes, send replies",
              },
              style: "danger",
              action_id: "bulk_reply_confirm",
              value: JSON.stringify({
                searchTerm,
                message,
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
              action_id: "bulk_reply_cancel",
            },
          ],
        } as any,
      ],
    });
  } catch (error) {
    console.error("Error in handleReplyRequest:", error);
    await postSlackMessage(mailbox.slackBotToken, {
      channel: channelId,
      thread_ts: messageTs,
      text: "An error occurred while searching for tickets. Please try again.",
    });
  }
};

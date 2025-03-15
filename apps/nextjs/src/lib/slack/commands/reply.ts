import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { sendSlackResponse } from "./response";
import { CommandArgs, SlackUser } from "./types";

export const handleReplyCommand = async (
  args: CommandArgs,
  user: SlackUser,
  channelId: string,
  responseUrl: string,
  mailbox: { id: number },
) => {
  // Parse arguments
  const about = args.about || "";
  const message = args.message || "";

  if (!message) {
    await sendSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: 'Please provide a message to send using --message "Your message here"',
    });
    return;
  }

  try {
    const conditions = [eq(conversations.mailboxId, mailbox.id), eq(conversations.status, "open")];
    let matchingTickets: (typeof conversations.$inferSelect)[] = [];

    // If about parameter is provided, use searchEmailsByKeywords for encrypted content
    if (about) {
      const matches = await searchEmailsByKeywords(about, mailbox.id);
      if (matches.length > 0) {
        matchingTickets = await db
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
          );
      }
    } else {
      matchingTickets = await db
        .select()
        .from(conversations)
        .where(and(...conditions));
    }

    if (matchingTickets.length === 0) {
      await sendSlackResponse(responseUrl, {
        response_type: "ephemeral",
        text: "No matching tickets found to reply to.",
      });
      return;
    }

    await sendSlackResponse(responseUrl, {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `You are about to reply to *${matchingTickets.length}* tickets with the following message:`,
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
                about,
                message,
                mailboxId: mailbox.id,
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
        },
      ],
    });
  } catch (error) {
    console.error("Error in handleReplyCommand:", error);
    await sendSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "An error occurred while searching for tickets. Please try again.",
    });
  }
};

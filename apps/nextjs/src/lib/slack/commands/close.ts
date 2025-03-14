import { and, eq, ilike, inArray, lt } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { sendSlackResponse } from "./response";
import { CommandArgs, SlackUser } from "./types";

export const handleCloseCommand = async (
  args: CommandArgs,
  user: SlackUser,
  channelId: string,
  responseUrl: string,
  mailbox: { id: number },
) => {
  // Parse arguments
  const olderThan = args["older-than"] || "";
  const about = args.about || "";

  try {
    // Build the query conditions
    const baseConditions = [eq(conversations.mailboxId, mailbox.id), eq(conversations.status, "open")];
    let matchingTickets: (typeof conversations.$inferSelect)[] = [];

    if (olderThan) {
      let daysAgo = 30; // Default to 30 days

      if (olderThan.endsWith("d")) {
        daysAgo = parseInt(olderThan.slice(0, -1)) || 30;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      baseConditions.push(lt(conversations.createdAt, cutoffDate));
    }

    // If about parameter is provided, use searchEmailsByKeywords for encrypted content
    if (about) {
      const matches = await searchEmailsByKeywords(about, mailbox.id);

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
      await sendSlackResponse(responseUrl, {
        response_type: "ephemeral",
        text: "No matching tickets found to close.",
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
            text: `You are about to close *${matchingTickets.length}* tickets. Are you sure?`,
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
                olderThan,
                about,
                mailboxId: mailbox.id,
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
        },
      ],
    });
  } catch (error) {
    console.error("Error in handleCloseCommand:", error);
    await sendSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "An error occurred while searching for tickets. Please try again.",
    });
  }
};

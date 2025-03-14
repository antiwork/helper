import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { env } from "@/env";
import { updateConversation } from "@/lib/data/conversation";
import { searchEmailsByKeywords } from "@/lib/emailSearchService/searchEmailsByKeywords";
import { sendSlackResponse } from "./response";
import { CommandArgs, SlackUser } from "./types";

export const handleAssignCommand = async (
  args: CommandArgs,
  user: SlackUser,
  channelId: string,
  responseUrl: string,
  mailbox: { id: number; slug: string; slackBotToken: string },
) => {
  const searchTerm = args.search || "";

  try {
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
          .limit(1);
      }
    } else {
      // If no search term, just get the most recent open ticket
      tickets = await db
        .select()
        .from(conversations)
        .where(and(eq(conversations.mailboxId, mailbox.id), eq(conversations.status, "open")))
        .orderBy(desc(conversations.createdAt))
        .limit(1);
    }

    const [ticket] = tickets;

    if (!ticket) {
      await sendSlackResponse(responseUrl, {
        response_type: "ephemeral",
        text: searchTerm ? `No open tickets found matching "${searchTerm}".` : "No open tickets found.",
      });
      return;
    }

    // Assign the ticket to the user
    await db.transaction(async (tx) => {
      await updateConversation(
        ticket.id,
        {
          set: { assignedToClerkId: user.id },
          byUserId: user.id,
          message: "Assigned via Slack command",
        },
        tx,
      );
    });

    // Format the response
    const ticketUrl = `${env.AUTH_URL}/mailboxes/${mailbox.slug}/conversations?id=${ticket.slug}`;

    await sendSlackResponse(responseUrl, {
      response_type: "ephemeral",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Ticket assigned to you:* ${ticket.subject}`,
          },
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*From:* ${ticket.emailFromName || ticket.emailFrom}`,
            },
            {
              type: "mrkdwn",
              text: `*Date:* ${new Date(ticket.createdAt).toLocaleString()}`,
            },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `<${ticketUrl}|View Ticket>`,
          },
        },
      ],
    });
  } catch (error) {
    console.error("Error in handleAssignCommand:", error);
    await sendSlackResponse(responseUrl, {
      response_type: "ephemeral",
      text: "An error occurred while searching for tickets. Please try again.",
    });
  }
};

import { and, eq, inArray, like, SQL, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { IntentParameters, IntentResponse } from "../types";
import { checkMailboxRequirement } from "../utils";

type Conversation = Awaited<ReturnType<typeof db.query.conversations.findMany>>[number];

export const searchTickets = async (parameters: IntentParameters): Promise<IntentResponse> => {
  const { criteria = "" } = parameters;

  try {
    const mailboxResult = await checkMailboxRequirement(parameters, "search_tickets", String(criteria));
    if (mailboxResult.requiresMailbox) {
      return {
        text: mailboxResult.text,
        blocks: mailboxResult.blocks,
      };
    }

    const mailboxId = mailboxResult.specifiedMailbox?.id;
    const mailboxName = mailboxResult.specifiedMailbox?.name || `Mailbox #${mailboxId}`;

    let totalTickets: Conversation[] = [];

    if (criteria && typeof criteria === "string") {
      const searchTerms = criteria
        .toLowerCase()
        .replace(/^search/i, "")
        .replace(/\bin mailbox\s+\d+\b/i, "")
        .replace(/\bfor\b/i, "")
        .trim();

      if (searchTerms) {
        try {
          const { searchEmailsByKeywords } = await import("@/lib/emailSearchService/searchEmailsByKeywords");

          const results = await searchEmailsByKeywords(searchTerms, mailboxId);

          if (results.length > 0) {
            // Get unique conversation IDs
            const uniqueConversationIds = [...new Set(results.map((result) => result.conversationId))];

            totalTickets = await db.query.conversations.findMany({
              where: and(eq(conversations.mailboxId, mailboxId), inArray(conversations.id, uniqueConversationIds)),
              limit: 10,
            });
          }
        } catch (searchError) {
          console.error(`[SLACK_AGENT] Error searching mailbox ${mailboxId}:`, searchError);
        }
      }
    }

    if (totalTickets.length === 0) {
      totalTickets = await db.query.conversations.findMany({
        where: eq(conversations.mailboxId, mailboxId),
        limit: 10,
      });
    }

    if (totalTickets.length === 0) {
      return {
        text: `No tickets found ${criteria ? `matching "${criteria}" ` : ""}in ${mailboxName}.`,
      };
    }

    // Format the results
    const ticketListText = totalTickets
      .map((ticket, index) => {
        const subject = ticket.subject || "No subject";
        const status = ticket.status || "unknown";
        const ticketUrl = ticket.slug ? `/tickets/${ticket.slug}` : "#";
        return `*${index + 1}.* <${ticketUrl}|${subject}> (${status})`;
      })
      .join("\n");

    let responseText = `*Found ${totalTickets.length} ticket${totalTickets.length === 1 ? "" : "s"} ${
      criteria ? `matching "${criteria}" ` : ""
    }in ${mailboxName}:*\n\n${ticketListText}`;

    if (totalTickets.length === 10) {
      responseText += "\n\n_Showing first 10 results._";
    }

    responseText += "\n\n*What would you like to do?*\n";
    responseText += "• To reply to one of these tickets, click the link to open it in Helper\n";
    responseText += "• To reply to all tickets in this list, use `reply to all above tickets saying [your message]`\n";
    responseText += `• To close tickets, use \`close tickets about ${criteria || "specific topic"}\``;

    return {
      text: responseText,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Found ${totalTickets.length} ticket${totalTickets.length === 1 ? "" : "s"} ${
              criteria ? `matching "${criteria}" ` : ""
            }in ${mailboxName}:*`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: ticketListText,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*What would you like to do next?*",
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `• To reply to one of these tickets, click the link to open it in Helper\n• To reply to all tickets in this list, use \`reply to all above tickets saying [your message]\`\n• To close tickets, use \`close tickets about ${criteria || "specific topic"}\``,
          },
        },
      ],
    };
  } catch (error) {
    console.error("[SLACK_AGENT] Error searching tickets:", error);
    return {
      text: "Sorry, I encountered an error while searching for tickets. Please try again later.",
    };
  }
};

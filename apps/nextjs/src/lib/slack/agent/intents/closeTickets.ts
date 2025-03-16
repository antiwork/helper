import { and, eq, inArray, SQL, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { IntentParameters, IntentResponse } from "../types";
import { checkMailboxRequirement } from "../utils";

type Conversation = Awaited<ReturnType<typeof db.query.conversations.findMany>>[number];

export const closeTickets = async (parameters: IntentParameters): Promise<IntentResponse> => {
  const { criteria = "" } = parameters;

  try {
    const mailboxResult = await checkMailboxRequirement(parameters, "close_tickets", String(criteria));
    if (mailboxResult.requiresMailbox) {
      return {
        text: mailboxResult.text,
        blocks: mailboxResult.blocks,
      };
    }

    const mailboxId = mailboxResult.specifiedMailbox?.id;
    const mailboxName = mailboxResult.specifiedMailbox?.name || `Mailbox #${mailboxId}`;

    let query: SQL | undefined;
    let ticketsToClose: Conversation[] = [];

    if (criteria && typeof criteria === "string") {
      const searchTerms = criteria
        .toLowerCase()
        .replace(/^close/i, "")
        .replace(/\bin mailbox\s+\d+\b/i, "")
        .replace(/\btickets\b/i, "")
        .trim();

      if (searchTerms) {
        try {
          const { searchEmailsByKeywords } = await import("@/lib/emailSearchService/searchEmailsByKeywords");
          const results = await searchEmailsByKeywords(searchTerms, mailboxId);

          if (results.length > 0) {
            const uniqueConversationIds = [...new Set(results.map((result) => result.conversationId))];

            // Fetch the actual conversations to close (must be open)
            ticketsToClose = await db.query.conversations.findMany({
              where: and(
                eq(conversations.mailboxId, mailboxId),
                eq(conversations.status, "open"),
                inArray(conversations.id, uniqueConversationIds),
              ),
              limit: 10,
            });
          }
        } catch (searchError) {
          console.error(`[SLACK_AGENT] Error searching mailbox ${mailboxId}:`, searchError);
        }
      }
    }

    if (ticketsToClose.length === 0) {
      ticketsToClose = await db.query.conversations.findMany({
        where: and(eq(conversations.mailboxId, mailboxId), eq(conversations.status, "open"), query || sql`1=1`),
        limit: 10,
      });
    }

    if (ticketsToClose.length === 0) {
      return {
        text: `No open tickets found ${criteria ? `matching "${criteria}" ` : ""}in ${mailboxName}.`,
      };
    }

    const now = new Date();
    const ticketIds = ticketsToClose.map((ticket) => ticket.id);

    await db
      .update(conversations)
      .set({
        status: "closed",
        closedAt: now,
        updatedAt: now,
      })
      .where(and(inArray(conversations.id, ticketIds), eq(conversations.mailboxId, mailboxId)));

    const ticketListText = ticketsToClose
      .map((ticket) => {
        const subject = ticket.subject || "No subject";
        const ticketUrl = ticket.slug ? `/tickets/${ticket.slug}` : "#";
        return `• <${ticketUrl}|${subject}>`;
      })
      .join("\n");

    const responseText = `Closed ${ticketsToClose.length} ticket${
      ticketsToClose.length === 1 ? "" : "s"
    } ${criteria ? `matching "${criteria}" ` : ""}in ${mailboxName}:\n\n${ticketListText}`;

    return {
      text: responseText,
    };
  } catch (error) {
    console.error("[SLACK_AGENT] Error closing tickets:", error);
    return {
      text: "Sorry, I encountered an error while closing tickets. Please try again later.",
    };
  }
};

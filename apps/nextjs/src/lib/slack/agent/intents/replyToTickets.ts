import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { IntentParameters, IntentResponse } from "../types";
import { checkMailboxRequirement, extractMessageContent } from "../utils";

export const replyToTickets = async (parameters: IntentParameters): Promise<IntentResponse> => {
  const { criteria = "" } = parameters;

  const messageText = extractMessageContent(parameters.message);

  const messagePreview = messageText
    ? `"${messageText.substring(0, 50)}${messageText.length > 50 ? "..." : ""}"`
    : "(no message provided)";

  if (!messageText) {
    console.log(`[SLACK_AGENT] No message provided for reply`);
    return { text: "Please provide a message to send as a reply." };
  }

  try {
    const mailboxCheck = await checkMailboxRequirement(parameters, "reply_to_tickets", criteria);

    if (mailboxCheck.requiresMailbox) {
      return { text: mailboxCheck.text, blocks: mailboxCheck.blocks };
    }

    const mailboxesToSearch = mailboxCheck.specifiedMailbox ? [mailboxCheck.specifiedMailbox] : mailboxCheck.mailboxes;
    console.log(`[SLACK_AGENT] Replying to tickets in ${mailboxesToSearch.length} mailbox(es)`);

    let ticketsToReply: any[] = [];

    if (criteria.includes("about") || criteria.includes("regarding")) {
      const topicMatch =
        criteria.match(/about\s+(.+?)(?:\s+and|\s+or|\s+with|\s+before|$)/i) ||
        criteria.match(/regarding\s+(.+?)(?:\s+and|\s+or|\s+with|\s+before|$)/i);
      const topic = topicMatch ? topicMatch[1] : "";

      if (topic) {
        let allResults: { id: number; conversationId: number }[] = [];

        for (const mailbox of mailboxesToSearch) {
          try {
            const { searchEmailsByKeywords } = await import("@/lib/emailSearchService/searchEmailsByKeywords");

            const results = await searchEmailsByKeywords(topic, mailbox.id);

            allResults = [...allResults, ...results];
          } catch (searchError) {
            console.error(`[SLACK_AGENT] Error searching mailbox ${mailbox.id}:`, searchError);
          }
        }

        if (allResults.length > 0) {
          const uniqueConversationIds = [...new Set(allResults.map((result) => result.conversationId))];
          const whereClause = and(eq(conversations.status, "open"), inArray(conversations.id, uniqueConversationIds));

          ticketsToReply = await db.query.conversations.findMany({
            where: whereClause,
            limit: 5, // Limit to 5 tickets for safety
          });
        }
      }
    } else if (criteria && criteria.trim() !== "") {
      // If criteria is provided but doesn't include "about" or "regarding", treat it as a search term
      let allResults: { id: number; conversationId: number }[] = [];

      for (const mailbox of mailboxesToSearch) {
        try {
          const { searchEmailsByKeywords } = await import("@/lib/emailSearchService/searchEmailsByKeywords");

          const results = await searchEmailsByKeywords(criteria, mailbox.id);

          allResults = [...allResults, ...results];
        } catch (searchError) {
          console.error(`[SLACK_AGENT] Error searching mailbox ${mailbox.id}:`, searchError);
        }
      }

      if (allResults.length > 0) {
        const uniqueConversationIds = [...new Set(allResults.map((result) => result.conversationId))];

        const whereClause = and(eq(conversations.status, "open"), inArray(conversations.id, uniqueConversationIds));

        ticketsToReply = await db.query.conversations.findMany({
          where: whereClause,
          limit: 5, // Limit to 5 tickets for safety
        });
      }
    } else if (mailboxCheck.specifiedMailbox) {
      const whereClause = and(
        eq(conversations.status, "open"),
        eq(conversations.mailboxId, mailboxCheck.specifiedMailbox.id),
      );

      ticketsToReply = await db.query.conversations.findMany({
        where: whereClause,
        limit: 5, // Limit to 5 tickets for safety
      });
    } else {
      const whereClause = eq(conversations.status, "open");

      ticketsToReply = await db.query.conversations.findMany({
        where: whereClause,
        limit: 5, // Limit to 5 tickets for safety
      });
    }

    // If no tickets found, return an error
    if (ticketsToReply.length === 0) {
      return {
        text: `No tickets found matching your criteria${mailboxCheck.specifiedMailbox ? ` in mailbox "${mailboxCheck.specifiedMailbox.name || `Mailbox #${mailboxCheck.specifiedMailbox.id}`}"` : ""}.`,
      };
    }

    for (const ticket of ticketsToReply) {
      await db.insert(conversationMessages).values({
        conversationId: ticket.id,
        body: messageText,
        role: "staff" as const,
        status: "sent" as const,
        isPerfect: true,
        isFlaggedAsBad: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return { text: `Replied to ${ticketsToReply.length} tickets with your message.` };
  } catch (error) {
    return { text: "Sorry, I encountered an error while replying to tickets." };
  }
};

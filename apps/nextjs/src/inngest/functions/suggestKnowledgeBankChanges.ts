import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages, faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { runAIObjectQuery } from "@/lib/ai";
import { getMailboxById } from "@/lib/data/mailbox";
import { findSimilarInKnowledgeBank } from "@/lib/data/retrieval";

// Define the schema for the AI response
const suggestionResponseSchema = z.object({
  action: z.enum(["no_action", "create_entry", "update_entry"]),
  reason: z.string(),
  content: z.string().optional(),
  faqIdToReplace: z.number().optional(),
});

export const suggestKnowledgeBankChanges = async (messageId: number, reason: string | null): Promise<void> => {
  // Get the message that was flagged as bad
  const message = await db.query.conversationMessages.findFirst({
    where: eq(conversationMessages.id, messageId),
    with: {
      conversation: {
        with: {
          mailbox: true,
        },
      },
    },
  });

  if (!message) {
    throw new NonRetriableError("Message not found");
  }

  const mailbox = message.conversation.mailbox;
  const messageContent = message.body || message.cleanedUpText || "";
  const flagReason = reason || "No reason provided";

  // Find similar items in knowledge bank for context
  const similarFAQs = await findSimilarInKnowledgeBank(messageContent, mailbox);

  // Prepare system prompt for AI
  const systemPrompt = `
  You are analyzing a message that was flagged as a bad response in a customer support system.
  Your task is to determine if this should lead to a change in the knowledge bank.
  
  Based on the message content, the reason it was flagged as bad, and similar entries in the knowledge bank,
  decide on one of these actions:
  1. no_action - No change needed to the knowledge bank
  2. create_entry - Create a new entry in the knowledge bank
  3. update_entry - Update an existing entry in the knowledge bank
  
  If you choose create_entry or update_entry, provide the content for the new or updated entry.
  If you choose update_entry, specify which existing entry should be replaced by its ID.
  
  Respond with a JSON object with these fields:
  - action: "no_action", "create_entry", or "update_entry"
  - reason: A brief explanation of your decision
  - content: The content for the new or updated entry (only for create_entry or update_entry)
  - faqIdToReplace: The ID of the entry to replace (only for update_entry)
  `;

  // Prepare user prompt with context
  const userPrompt = `
  Message that was flagged as bad:
  "${messageContent}"
  
  Reason for flagging:
  "${flagReason}"
  
  Similar entries in knowledge bank:
  ${similarFAQs
    .map(
      (faq) => `Similarity: ${faq.similarity.toFixed(2)}
  Content: "${faq.content}"`,
    )
    .join("\n\n")}
  `;

  // Run AI query to get suggestion
  const suggestion = await runAIObjectQuery({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    mailbox,
    queryType: "reasoning",
    schema: suggestionResponseSchema,
  });

  // Process the suggestion
  if (suggestion.action === "no_action") {
    // No action needed
    return;
  }

  // Insert suggestion into faqs table
  await db.insert(faqs).values({
    content: suggestion.content || "",
    mailboxId: mailbox.id,
    suggested: true,
    suggestedReplacementForId: suggestion.action === "update_entry" ? suggestion.faqIdToReplace : null,
    messageId: message.id,
  });
};

// Export the Inngest function
export default inngest.createFunction(
  { id: "suggest-knowledge-bank-changes", concurrency: 10, retries: 1 },
  { event: "messages/flagged.bad" },
  async ({ event, step }) => {
    const { messageId, reason } = event.data;

    await step.run("suggest-knowledge-bank-changes", async () => {
      await suggestKnowledgeBankChanges(messageId, reason);
    });

    return { success: true };
  },
);

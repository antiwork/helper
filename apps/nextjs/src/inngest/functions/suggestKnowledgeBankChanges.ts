import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages, faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { assertDefinedOrRaiseNonRetriableError } from "@/inngest/utils";
import { runAIObjectQuery } from "@/lib/ai";
import { findSimilarInKnowledgeBank } from "@/lib/data/retrieval";

const suggestionResponseSchema = z.object({
  action: z.enum(["no_action", "create_entry", "update_entry"]),
  reason: z.string(),
  content: z.string().optional(),
  faqIdToReplace: z.number().optional(),
});

export const suggestKnowledgeBankChanges = async (messageId: number, reason: string | null) => {
  const message = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, messageId),
      with: {
        conversation: {
          with: {
            mailbox: true,
          },
        },
      },
    }),
  );

  const mailbox = message.conversation.mailbox;
  const messageContent = message.body || message.cleanedUpText || "";
  const flagReason = reason || "No reason provided";

  const similarFAQs = await findSimilarInKnowledgeBank(messageContent, mailbox);
  const existingSuggestions = await db.query.faqs.findMany({
    where: and(eq(faqs.suggested, true), eq(faqs.mailboxId, mailbox.id)),
  });

  const systemPrompt = `
  You are analyzing a message that was flagged as a bad response in a customer support system.
  Your task is to determine if this should lead to a change in the knowledge bank.
  
  Based on the message content, the reason it was flagged as bad, and existing entries in the knowledge bank,
  decide on one of these actions:
  1. no_action - No change needed to the knowledge bank. Choose this if the flagged issue is already sufficiently covered by an existing entry.
  2. create_entry - Create a new entry in the knowledge bank. Choose this if the flagged issue is an entirely new problem that is not closely related to any existing entries.
  3. update_entry - Update an existing entry in the knowledge bank. Choose this if an existing entry is close to the flagged issue but appears to have missing or incorrect information.
  
  If you choose create_entry or update_entry, provide the content for the new or updated entry.
  If you choose update_entry, specify which existing entry should be replaced by its ID.
  
  Respond with a JSON object with these fields:
  - action: "no_action", "create_entry", or "update_entry"
  - reason: A brief explanation of your decision
  - content: The content for the new or updated entry (only for create_entry or update_entry)
  - faqIdToReplace: The ID of the entry to replace (only for update_entry)
  `;

  const userPrompt = `
  Message that was flagged as bad:
  "${messageContent}"
  
  Reason for flagging:
  "${flagReason}"
  
  Existing entries in knowledge bank:

  ${similarFAQs
    .map(
      (faq) => `ID: ${faq.id}
  Content: "${faq.content}"`,
    )
    .join("\n\n")}
  ${existingSuggestions
    .map(
      (faq) => `ID: ${faq.id}
  Content: "${faq.content}"`,
    )
    .join("\n\n")}
  `;

  const suggestion = await runAIObjectQuery({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    mailbox,
    queryType: "suggest_knowledge_bank_changes",
    schema: suggestionResponseSchema,
  });

  if (suggestion.action === "create_entry") {
    const newFaqs = await db.insert(faqs).values({
      content: suggestion.content || "",
      mailboxId: mailbox.id,
      suggested: true,
      enabled: false,
      messageId: message.id,
    }).returning();
    
    const newFaq = newFaqs[0];
    if (newFaq) {
      // Trigger notification for new suggested edit
      inngest.send({
        name: "faqs/suggested.created",
        data: { faqId: newFaq.id },
      });
    }
  } else if (suggestion.action === "update_entry" && suggestion.faqIdToReplace) {
    const suggestionToUpdate =
      existingSuggestions.find((faq) => faq.id === suggestion.faqIdToReplace) ||
      (await db.query.faqs.findFirst({
        where: eq(faqs.suggestedReplacementForId, suggestion.faqIdToReplace),
      }));
    if (suggestionToUpdate) {
      await db
        .update(faqs)
        .set({
          content: suggestion.content || "",
          messageId: message.id,
        })
        .where(eq(faqs.id, suggestion.faqIdToReplace));
    } else {
      const newFaqs = await db.insert(faqs).values({
        content: suggestion.content || "",
        mailboxId: mailbox.id,
        suggested: true,
        enabled: false,
        suggestedReplacementForId: suggestion.action === "update_entry" ? suggestion.faqIdToReplace : null,
        messageId: message.id,
      }).returning();
      
      const newFaq = newFaqs[0];
      if (newFaq) {
        // Trigger notification for new suggested edit
        inngest.send({
          name: "faqs/suggested.created",
          data: { faqId: newFaq.id },
        });
      }
    }
  }

  return suggestion;
};

export default inngest.createFunction(
  { id: "suggest-knowledge-bank-changes", concurrency: 10, retries: 1 },
  { event: "messages/flagged.bad" },
  async ({ event, step }) => {
    const { messageId, reason } = event.data;

    return await step.run("suggest-knowledge-bank-changes", () => suggestKnowledgeBankChanges(messageId, reason));
  },
);

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { inngest } from "@/inngest/client";
import { getConversationById } from "@/lib/data/conversation";
import { getConversationMessageById } from "@/lib/data/conversationMessage";
import { getMailboxById } from "@/lib/data/mailbox";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

// Define the type for similar conversation results
type SimilarConversationsResult =
  | { hasSimilar: false }
  | { hasSimilar: true; targetConversation: { id: number; [key: string]: any } };

const SIMILARITY_THRESHOLD = 0.7; // Higher threshold for conversation merging

export default inngest.createFunction(
  {
    id: "detect-similar-conversations",
    debounce: { key: "event.data.messageId", period: "1m", timeout: "5m" },
  },
  { event: "conversations/message.created" },
  async ({ event, step }) => {
    const { messageId } = event.data;

    // Get the message and conversation
    const message = assertDefinedOrRaiseNonRetriableError(await getConversationMessageById(messageId));
    const conversation = assertDefinedOrRaiseNonRetriableError(await getConversationById(message.conversationId));

    // Skip if this is a prompt or already merged conversation
    if (conversation.isPrompt || conversation.mergedIntoId) {
      return { message: "Skipped: conversation is a prompt or already merged" };
    }

    // Get the mailbox
    const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(conversation.mailboxId));

    // Check if there are similar conversations from the same customer
    const similarResult = await step.run("find-similar-conversations", async () => {
      // Only check for recent conversations from the same customer (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);

      // Use the conversation embedding or content to find similar conversations
      const queryText = conversation.embeddingText || message.cleanedUpText || message.body || "";
      if (!queryText) {
        return { hasSimilar: false };
      }

      const similarConversations = await findSimilarConversations(
        queryText,
        mailbox,
        5, // Limit to 5 results
        conversation.slug, // Exclude the current conversation
        SIMILARITY_THRESHOLD, // Use a higher threshold for merging
      );

      if (!similarConversations || similarConversations.length === 0) {
        return { hasSimilar: false };
      }

      // Filter to conversations from the same customer (by email) and recent ones
      const sameCustomerConversations = similarConversations.filter(
        (c) => c.emailFrom === conversation.emailFrom && c.createdAt > oneDayAgo && !c.mergedIntoId,
      );

      return {
        hasSimilar: sameCustomerConversations.length > 0,
        targetConversation: sameCustomerConversations.length > 0 ? sameCustomerConversations[0] : null,
      };
    });

    // If a similar conversation was found, mark this one as merged into it
    if (similarResult.hasSimilar && "targetConversation" in similarResult && similarResult.targetConversation) {
      await db
        .update(conversations)
        .set({ mergedIntoId: similarResult.targetConversation.id })
        .where(eq(conversations.id, conversation.id));

      return { message: `Conversation ${conversation.id} merged into ${similarResult.targetConversation.id}` };
    }

    return { message: "No similar conversations found" };
  },
);

import { triggerEvent } from "@/jobs/trigger";
import { NonRetriableError } from "@/jobs/utils";
import { createConversationEmbedding, PromptTooLongError } from "@/lib/ai/conversationEmbedding";
import { getConversationBySlug } from "@/lib/data/conversation";

export const embeddingConversation = async ({ conversationSlug }: { conversationSlug: string }) => {
  const conversation = await getConversationBySlug(conversationSlug);
  if (!conversation) {
    throw new NonRetriableError("Conversation not found");
  }
  try {
    await createConversationEmbedding(conversation.id);
  } catch (e) {
    if (e instanceof PromptTooLongError) return { message: e.message };
    throw e;
  }

  if ("status" in conversation && conversation.status === "open") {
    await triggerEvent("conversations/update-suggested-actions", { conversationId: conversation.id });
  }
};

import { generateConversationSummary } from "@/lib/ai/generateConversationSummary";
import { getOriginalConversation } from "@/lib/data/conversation";
import { getConversationMessageById } from "@/lib/data/conversationMessage";
import { triggerEvent } from "./trigger";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

export const generateConversationSummaryEmbeddings = async ({ messageId }: { messageId: number }) => {
  const conversationMessage = assertDefinedOrRaiseNonRetriableError(await getConversationMessageById(messageId));
  const conversation = assertDefinedOrRaiseNonRetriableError(
    await getOriginalConversation(conversationMessage.conversationId),
  );

  const wasGenerated = await generateConversationSummary(conversation);
  if (wasGenerated) {
    await triggerEvent("conversations/embedding.create", { conversationSlug: conversation.slug });
    return { message: `Message ${messageId}: Summary and embeddings created` };
  }

  return { message: `Message ${messageId}: Summary not generated` };
};

import { inngest } from "@/inngest/client";
import { generateConversationSummary } from "@/lib/ai/generateConversationSummary";
import { getConversationById } from "@/lib/data/conversation";
import { getConversationMessageById } from "@/lib/data/conversationMessage";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

export default inngest.createFunction(
  {
    id: "generate-conversation-summary-and-embeddings",
    debounce: { key: "event.data.conversationId", period: "10m", timeout: "30m" },
  },
  { event: "conversations/message.created" },
  async ({ event, step }) => {
    const { messageId } = event.data;

    const conversationMessage = assertDefinedOrRaiseNonRetriableError(await getConversationMessageById(messageId));
    const conversation = assertDefinedOrRaiseNonRetriableError(
      await getConversationById(conversationMessage.conversationId),
    );

    if (!conversation.isPrompt) {
      await generateConversationSummary(conversationMessage.conversationId);

      await step.sendEvent("generate-embeddings", {
        name: "conversations/embedding.create",
        data: { conversationSlug: conversation.slug },
      });
    }

    return { message: `Message ${messageId}: Summary and embeddings created` };
  },
);

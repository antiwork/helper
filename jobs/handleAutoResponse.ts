import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { checkTokenCountAndSummarizeIfNeeded, generateDraftResponse, respondWithAI } from "@/lib/ai/chat";
import { cleanUpTextForAI } from "@/lib/ai/core";
import { updateConversation } from "@/lib/data/conversation";
import { ensureCleanedUpText, getTextWithConversationSubject } from "@/lib/data/conversationMessage";
import { createMessageNotification } from "@/lib/data/messageNotifications";
import { upsertPlatformCustomer } from "@/lib/data/platformCustomer";
import { fetchMetadata } from "@/lib/data/retrieval";

export const handleAutoResponse = async ({ messageId }: { messageId: number }) => {
  const message = await db.query.conversationMessages
    .findFirst({
      where: eq(conversationMessages.id, messageId),
      with: {
        conversation: {
          with: {
            mailbox: true,
          },
        },
      },
    })
    .then(assertDefined);

  if (message.conversation.status === "spam") return { message: "Skipped - conversation is spam" };
  if (message.role === "staff") return { message: "Skipped - message is from staff" };

  await ensureCleanedUpText(message);

  const customerMetadata = message.emailFrom ? await fetchMetadata(message.emailFrom) : null;
  if (customerMetadata) {
    await db
      .update(conversationMessages)
      .set({ metadata: customerMetadata ?? null })
      .where(eq(conversationMessages.id, messageId));

    if (message.emailFrom) {
      await upsertPlatformCustomer({
        email: message.emailFrom,
        mailboxId: message.conversation.mailboxId,
        customerMetadata: customerMetadata.metadata,
      });
    }
  }

  if (!message.conversation.assignedToAI) return { message: "Skipped - not assigned to AI" };

  if (message.conversation.mailbox.preferences?.autoRespondEmailToChat === "draft") {
    const aiDraft = await generateDraftResponse(message.conversation.id, message.conversation.mailbox);
    return { message: "Draft response generated", draftId: aiDraft.id };
  }

  const emailText = (await getTextWithConversationSubject(message.conversation, message)).trim();
  if (emailText.length === 0) return { message: "Skipped - email text is empty" };

  const messageText = cleanUpTextForAI(
    [message.conversation.subject ?? "", message.cleanedUpText ?? message.body ?? ""].join("\n\n"),
  );
  const processedText = await checkTokenCountAndSummarizeIfNeeded(messageText);

  const response = await respondWithAI({
    conversation: message.conversation,
    mailbox: message.conversation.mailbox,
    userEmail: message.emailFrom,
    message: {
      id: message.id.toString(),
      content: processedText,
      role: "user",
    },
    messageId: message.id,
    readPageTool: null,
    sendEmail: true,
    guideEnabled: false,
    onResponse: async ({ platformCustomer, humanSupportRequested }) => {
      await db.transaction(async (tx) => {
        if (platformCustomer && !humanSupportRequested) {
          await createMessageNotification({
            messageId: message.id,
            conversationId: message.conversationId,
            platformCustomerId: platformCustomer.id,
            notificationText: `You have a new reply for ${message.conversation.subject ?? "(no subject)"}`,
            tx,
          });
        }

        if (!humanSupportRequested) {
          await updateConversation(
            message.conversationId,
            { set: { conversationProvider: "chat", status: "closed" } },
            tx,
          );
        }
      });
    },
  });

  // Consume the response to make sure we wait for the AI to generate it
  const reader = assertDefined(response.body).getReader();
  while (true) {
    const { done } = await reader.read();
    if (done) break;
  }

  return { message: "Auto response sent", messageId };
};

import { and, eq, gt, inArray } from "drizzle-orm";
import { ToolRequestBody } from "@helperai/client";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { checkTokenCountAndSummarizeIfNeeded, generateDraftResponse, respondWithAI } from "@/lib/ai/chat";
import { cleanUpTextForAI } from "@/lib/ai/core";
import { updateConversation } from "@/lib/data/conversation";
import { ensureCleanedUpText, getTextWithConversationSubject } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";
import { createMessageNotification } from "@/lib/data/messageNotifications";

class AITimeoutError extends Error {}

export const handleAutoResponse = async ({
  messageId,
  tools,
  customerInfoUrl,
  responseTimeoutMs = 50_000,
}: {
  messageId: number;
  tools?: Record<string, ToolRequestBody>;
  customerInfoUrl?: string | null;
  responseTimeoutMs?: number;
}) => {
  const message = await db.query.conversationMessages
    .findFirst({
      where: eq(conversationMessages.id, messageId),
    })
    .then(assertDefined);

  const conversation = await db.query.conversations
    .findFirst({
      where: eq(conversations.id, message.conversationId),
    })
    .then(assertDefined);

  if (conversation.status === "spam") return { message: "Skipped - conversation is spam" };
  if (message.role === "staff") return { message: "Skipped - message is from staff" };

  const newerMessage = await db.query.conversationMessages.findFirst({
    columns: { id: true },
    where: and(
      eq(conversationMessages.conversationId, message.conversationId),
      inArray(conversationMessages.role, ["user", "staff", "ai_assistant"]),
      gt(conversationMessages.createdAt, message.createdAt),
    ),
  });

  if (newerMessage) return { message: "Skipped - newer message exists" };

  await ensureCleanedUpText(message);

  const mailbox = await getMailbox();
  if (!mailbox) return { message: "Skipped - mailbox not found" };

  if (!conversation.assignedToAI) {
    await updateConversation(conversation.id, { set: { status: "open" }, message: "Not assigned to AI" });
    return { message: "Skipped - not assigned to AI" };
  }

  if (mailbox?.preferences?.autoRespondEmailToChat === "draft") {
    const aiDraft = await generateDraftResponse(conversation.id, mailbox, tools);
    return { message: "Draft response generated", draftId: aiDraft.id };
  }

  const emailText = (await getTextWithConversationSubject(conversation, message)).trim();
  if (emailText.length === 0) return { message: "Skipped - email text is empty" };

  const messageText = cleanUpTextForAI(
    [conversation.subject ?? "", message.cleanedUpText ?? message.body ?? ""].join("\n\n"),
  );
  const processedText = await checkTokenCountAndSummarizeIfNeeded(messageText);

  const sendResponse = async () => {
    const response = await respondWithAI({
      conversation,
      mailbox,
      tools,
      customerInfoUrl,
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
      reasoningEnabled: false,
      onResponse: async ({ platformCustomer, humanSupportRequested }) => {
        await db.transaction(async (tx) => {
          if (platformCustomer && !humanSupportRequested) {
            await createMessageNotification({
              messageId: message.id,
              conversationId: message.conversationId,
              platformCustomerId: platformCustomer.id,
              notificationText: `You have a new reply for ${conversation.subject ?? "(no subject)"}`,
              tx,
            });
          }

          if (!humanSupportRequested) {
            await updateConversation(
              message.conversationId,
              {
                set: { conversationProvider: "chat", status: "closed" },
                message: "Automated reply sent (auto-response)",
              },
              tx,
            );
          }
        });
      },
    });

    // Consume the response to make sure we wait for the AI to generate it
    const reader = assertDefined(response.body).getReader();
    const decoder = new TextDecoder();
    let responseContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        responseContent += chunk;
      }
    }

    // eslint-disable-next-line no-console
    console.log("Auto response content:", responseContent);

    return { message: "Auto response sent", messageId };
  };

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new AITimeoutError()), responseTimeoutMs);
  });

  try {
    return await Promise.race([sendResponse(), timeoutPromise]);
  } catch (error) {
    if (error instanceof AITimeoutError) {
      await updateConversation(conversation.id, { set: { status: "open" }, message: "AI response timeout" });
      return { message: "Timeout - conversation set to open" };
    }
    throw error;
  }
};

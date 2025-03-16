import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import AutoReplyEmail from "@/emails/autoReply";
import { inngest } from "@/inngest/client";
import { checkTokenCountAndSummarizeIfNeeded, respondWithAI } from "@/lib/ai/chat";
import { cleanUpTextForAI } from "@/lib/ai/core";
import { updateConversation } from "@/lib/data/conversation";
import { createMessageNotification } from "@/lib/data/messageNotifications";
import { sendEmail } from "@/lib/resend/client";

const getResponseText = async (response: Response): Promise<string> => {
  const reader = assertDefined(response.body).getReader();

  let aiResponse = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = new TextDecoder().decode(value);
    const lines = chunk.split("\n").filter((line) => line.trim().startsWith("data: "));
    for (const line of lines) {
      try {
        const json = JSON.parse(line.substring(6));
        if (json.type === "text" && json.value) aiResponse += json.value;
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }

  return aiResponse;
};

export const handleAutoResponse = async (messageId: number) => {
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

  const messageText = cleanUpTextForAI(message.cleanedUpText ?? message.body ?? "");
  const processedText = await checkTokenCountAndSummarizeIfNeeded(messageText);

  const { response, platformCustomer } = await respondWithAI({
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
  });

  const aiResponse = await getResponseText(response);

  console.log(aiResponse);

  await db.transaction(async (tx) => {
    if (platformCustomer) {
      await createMessageNotification({
        messageId: message.id,
        conversationId: message.conversationId,
        platformCustomerId: platformCustomer.id,
        notificationText: `You have a new reply for ${message.conversation.subject ?? "(no subject)"}`,
        tx,
      });
    }

    await sendEmail({
      from: "Helper <no-reply@helper.ai>",
      to: assertDefined(message.emailFrom),
      subject: `Re: ${message.conversation.subject ?? "(no subject)"}`,
      react: AutoReplyEmail({
        content: aiResponse,
        companyName: message.conversation.mailbox.name,
        widgetHost: message.conversation.mailbox.widgetHost,
        hasPlatformCustomer: !!platformCustomer,
      }),
    });

    await updateConversation(message.conversationId, { set: { conversationProvider: "chat", status: "closed" } }, tx);
  });

  return { message: `Auto response sent for message ${messageId}` };
};

export default inngest.createFunction(
  { id: "handle-auto-response" },
  { event: "conversations/auto-response.create" },
  async ({ event, step }) => {
    const { messageId } = event.data;

    return await step.run("handle", async () => await handleAutoResponse(messageId));
  },
);

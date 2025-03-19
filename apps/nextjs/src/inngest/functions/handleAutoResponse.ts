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

  await respondWithAI({
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
    onResponse: async ({ text, platformCustomer }) => {
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
            content: text,
            companyName: message.conversation.mailbox.name,
            widgetHost: message.conversation.mailbox.widgetHost,
            hasPlatformCustomer: !!platformCustomer,
          }),
        });

        await updateConversation(
          message.conversationId,
          { set: { conversationProvider: "chat", status: "closed" } },
          tx,
        );
      });
    },
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

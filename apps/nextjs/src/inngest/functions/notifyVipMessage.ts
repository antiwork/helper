import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { getClerkUser } from "@/lib/data/user";
import { postVipMessageToSlack, updateVipMessageInSlack } from "@/lib/slack/vipNotifications";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

type MessageWithConversationAndMailbox = typeof conversationMessages.$inferSelect & {
  conversation: typeof conversations.$inferSelect & {
    mailbox: typeof mailboxes.$inferSelect;
  };
};

async function fetchConversationMessage(messageId: number): Promise<MessageWithConversationAndMailbox> {
  return assertDefinedOrRaiseNonRetriableError(
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
}

async function handleVipSlackMessage(message: MessageWithConversationAndMailbox) {
  const conversation = assertDefinedOrRaiseNonRetriableError(message.conversation);
  const { mailbox } = conversation;

  if (conversation.isPrompt) {
    return "Not posted, prompt conversation";
  }

  const emailFrom = assertDefinedOrRaiseNonRetriableError(conversation.emailFrom);
  const platformCustomer = await getPlatformCustomer(mailbox.id, emailFrom);

  // Early return if not VIP or Slack config missing
  if (!platformCustomer?.isVip) return "Not posted, not a VIP customer";
  if (!mailbox.slackBotToken || !mailbox.vipChannelId) {
    return "Not posted, mailbox not linked to Slack";
  }

  // If it's an agent reply updating an existing Slack message
  if (message.role !== "user" && message.responseToId) {
    const originalMessage = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, message.responseToId),
    });

    if (originalMessage?.slackMessageTs) {
      const originalCleanedUpText = originalMessage ? await ensureCleanedUpText(originalMessage) : "";
      const replyCleanedUpText = await ensureCleanedUpText(message);

      await updateVipMessageInSlack({
        conversation,
        originalMessage: originalCleanedUpText,
        replyMessage: replyCleanedUpText,
        slackBotToken: mailbox.slackBotToken,
        slackChannel: mailbox.vipChannelId,
        slackMessageTs: originalMessage.slackMessageTs,
        user: message.clerkUserId ? await getClerkUser(message.clerkUserId) : null,
        email: true,
        closed: conversation.status === "closed",
      });
      return "Updated";
    }
  }

  if (message.role !== "user") {
    return "Not posted, not a user message and not a reply to a user message";
  }

  const cleanedUpText = await ensureCleanedUpText(message);

  const slackMessageTs = await postVipMessageToSlack({
    conversation,
    message: cleanedUpText,
    platformCustomer,
    slackBotToken: mailbox.slackBotToken,
    slackChannel: mailbox.vipChannelId,
  });

  await db
    .update(conversationMessages)
    .set({ slackMessageTs, slackChannel: mailbox.vipChannelId })
    .where(eq(conversationMessages.id, message.id));
  return "Posted";
}

export default inngest.createFunction(
  { id: "notify-vip-message" },
  { event: "conversations/message.created" },
  async ({ event, step }) => {
    const { messageId } = event.data;
    const message = await step.run("handle", async () => {
      const message = assertDefinedOrRaiseNonRetriableError(await fetchConversationMessage(messageId));
      return handleVipSlackMessage(message);
    });
    return { message };
  },
);

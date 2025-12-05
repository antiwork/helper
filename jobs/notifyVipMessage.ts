import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { getBasicProfileById } from "@/lib/data/user";
import { sendVipNotificationEmail } from "@/lib/emails/teamNotifications";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

type MessageWithConversationAndMailbox = typeof conversationMessages.$inferSelect & {
  conversation: typeof conversations.$inferSelect;
};

async function fetchConversationMessage(messageId: number): Promise<MessageWithConversationAndMailbox> {
  const message = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, messageId),
      with: {
        conversation: {},
      },
    }),
  );

  if (message.conversation.mergedIntoId) {
    const mergedConversation = assertDefinedOrRaiseNonRetriableError(
      await db.query.conversations.findFirst({
        where: eq(conversations.id, message.conversation.mergedIntoId),
      }),
    );

    return { ...message, conversation: mergedConversation };
  }

  return message;
}

async function handleVipEmailNotification(message: MessageWithConversationAndMailbox) {
  const conversation = assertDefinedOrRaiseNonRetriableError(message.conversation);
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());

  if (conversation.isPrompt) {
    return "Not sent, prompt conversation";
  }
  if (!conversation.emailFrom) {
    return "Not sent, anonymous conversation";
  }

  const platformCustomer = await getPlatformCustomer(conversation.emailFrom);

  // Early return if not VIP
  if (!platformCustomer?.isVip) return "Not sent, not a VIP customer";

  const cleanedUpText = await ensureCleanedUpText(message);

  // Format customer value for display
  const customerValue =
    platformCustomer.value !== null && platformCustomer.value !== undefined
      ? `$${(platformCustomer.value / 100).toLocaleString()}`
      : "Unknown";

  // If it's an agent reply to a VIP message, send update notification
  if (message.role !== "user" && message.responseToId) {
    const originalMessage = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, message.responseToId),
    });

    if (originalMessage) {
      const user = message.userId ? await getBasicProfileById(message.userId) : null;
      const repliedBy = user?.displayName || user?.email || "A team member";

      await sendVipNotificationEmail({
        customerEmail: conversation.emailFrom,
        customerValue,
        conversationSubject: conversation.subject || "No subject",
        messagePreview: await ensureCleanedUpText(originalMessage),
        conversationId: conversation.id,
        conversationSlug: conversation.slug,
        replyText: cleanedUpText,
        repliedBy,
        conversationStatus: conversation.status as "open" | "closed",
      });

      return "Reply notification sent";
    }
  }

  if (message.role !== "user") {
    return "Not sent, not a user message and not a reply to a user message";
  }

  // Send initial VIP message notification
  await sendVipNotificationEmail({
    customerEmail: conversation.emailFrom,
    customerValue,
    conversationSubject: conversation.subject || "No subject",
    messagePreview: cleanedUpText,
    conversationId: conversation.id,
    conversationSlug: conversation.slug,
    conversationStatus: conversation.status as "open" | "closed",
  });

  return "Notification sent";
}

export const notifyVipMessage = async ({ messageId }: { messageId: number }) => {
  const message = assertDefinedOrRaiseNonRetriableError(await fetchConversationMessage(messageId));
  return await handleVipEmailNotification(message);
};

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { getBasicProfileById } from "@/lib/data/user";
import { sendVipNotificationEmail } from "@/lib/email/notifications";
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

async function handleVipNotification(message: MessageWithConversationAndMailbox) {
  const conversation = assertDefinedOrRaiseNonRetriableError(message.conversation);
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());

  if (conversation.isPrompt) {
    return "Not posted, prompt conversation";
  }
  if (!conversation.emailFrom) {
    return "Not posted, anonymous conversation";
  }

  const platformCustomer = await getPlatformCustomer(conversation.emailFrom);

  // Early return if not VIP
  if (!platformCustomer?.isVip) return "Not posted, not a VIP customer";

  const cleanedUpText = await ensureCleanedUpText(message);

  // If it's an agent reply, send update notification
  if (message.role !== "user" && message.responseToId) {
    const originalMessage = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, message.responseToId),
    });

    if (originalMessage) {
      const originalCleanedUpText = await ensureCleanedUpText(originalMessage);
      const replyAuthor = message.userId ? (await getBasicProfileById(message.userId))?.displayName ?? undefined : undefined;

      await sendVipNotificationEmail({
        customerName: platformCustomer.name ?? conversation.emailFrom ?? "Unknown",
        customerEmail: conversation.emailFrom ?? "Unknown",
        message: originalCleanedUpText,
        conversationSubject: conversation.subject || "No subject",
        conversationSlug: conversation.slug,
        customerLinks: platformCustomer.links
          ? Object.entries(platformCustomer.links).map(([label, url]) => ({ label, url }))
          : undefined,
        replyMessage: cleanedUpText,
        replyAuthor,
        closed: conversation.status === "closed",
      });
      return "Updated";
    }
  }

  // Send new VIP message notification
  if (message.role === "user") {
    await sendVipNotificationEmail({
      customerName: platformCustomer.name ?? conversation.emailFrom ?? "Unknown",
      customerEmail: conversation.emailFrom ?? "Unknown",
      message: cleanedUpText,
      conversationSubject: conversation.subject || "No subject",
      conversationSlug: conversation.slug,
      customerLinks: platformCustomer.links
        ? Object.entries(platformCustomer.links).map(([label, url]) => ({ label, url }))
        : undefined,
      closed: conversation.status === "closed",
    });
    return "Posted";
  }

  return "Not posted, not a user message and not a reply to a user message";
}

export const notifyVipMessage = async ({ messageId }: { messageId: number }) => {
  const message = assertDefinedOrRaiseNonRetriableError(await fetchConversationMessage(messageId));
  return await handleVipNotification(message);
};

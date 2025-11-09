import { and, desc, eq, isNull, not } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { getBasicProfileById } from "@/lib/data/user";
import { sendVipNotificationEmail } from "./notifications";

/**
 * Send VIP notification email when a conversation is closed
 * Replaces the Slack updateVipMessageOnClose function
 */
export const updateVipMessageOnClose = async (conversationId: number, byUserId: string | null) => {
  const conversation = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });

  if (!conversation || !conversation.emailFrom) return;

  const platformCustomer = await getPlatformCustomer(conversation.emailFrom);
  if (!platformCustomer?.isVip) return;

  const vipMessages = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, conversationId),
      eq(conversationMessages.role, "user"),
    ),
    orderBy: [desc(conversationMessages.createdAt)],
  });

  if (vipMessages.length === 0) return;

  const responses = await db.query.conversationMessages.findMany({
    where: and(eq(conversationMessages.conversationId, conversationId), not(isNull(conversationMessages.responseToId))),
    orderBy: [desc(conversationMessages.createdAt)],
  });

  // Get the most recent user message and its response
  const latestVipMessage = vipMessages[0];
  if (!latestVipMessage) return;

  const response = responses.find((r) => r.responseToId === latestVipMessage.id);
  const originalCleanedUpText = await ensureCleanedUpText(latestVipMessage);
  const replyCleanedUpText = response ? await ensureCleanedUpText(response) : "";
  const replyAuthor = byUserId ? (await getBasicProfileById(byUserId))?.displayName ?? undefined : undefined;

  await sendVipNotificationEmail({
    customerName: platformCustomer.name ?? conversation.emailFrom ?? "Unknown",
    customerEmail: conversation.emailFrom,
    message: originalCleanedUpText,
    conversationSubject: conversation.subject || "No subject",
    conversationSlug: conversation.slug,
    customerLinks: platformCustomer.links
      ? Object.entries(platformCustomer.links).map(([label, url]) => ({ label, url }))
      : undefined,
    replyMessage: replyCleanedUpText,
    replyAuthor,
    closed: true,
  });
};



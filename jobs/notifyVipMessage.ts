import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db/client";
import { conversationMessages, conversations, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { getBasicProfileById } from "@/lib/data/user";
import VipNotificationEmail from "@/lib/emails/vipNotification";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
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
  assertDefinedOrRaiseNonRetriableError(await getMailbox());

  if (conversation.isPrompt) {
    return "Not sent, prompt conversation";
  }
  if (!conversation.emailFrom) {
    return "Not sent, anonymous conversation";
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
    return "Not sent, email not configured";
  }

  const platformCustomer = await getPlatformCustomer(conversation.emailFrom);

  if (!platformCustomer?.isVip) return "Not sent, not a VIP customer";

  const customerName = platformCustomer.name ?? conversation.emailFrom ?? "Unknown";
  const conversationLink = `${env.AUTH_URL}/conversations?id=${conversation.slug}`;
  const customerLinks = platformCustomer.links
    ? Object.entries(platformCustomer.links).map(([key, value]) => ({ label: key, url: value }))
    : undefined;

  let originalMessage = "";
  let replyMessage: string | undefined;
  let closedBy: string | undefined;

  if (message.role !== "user" && message.responseToId) {
    const originalMsg = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, message.responseToId),
    });

    if (originalMsg) {
      originalMessage = await ensureCleanedUpText(originalMsg);
      replyMessage = await ensureCleanedUpText(message);
      if (message.userId) {
        const user = await getBasicProfileById(message.userId);
        closedBy = user?.displayName || user?.email || undefined;
      }
    } else {
      return "Not sent, original message not found";
    }
  } else if (message.role === "user") {
    originalMessage = await ensureCleanedUpText(message);
  } else {
    return "Not sent, not a user message and not a reply to a user message";
  }

  const teamMembers = await db
    .select({
      email: authUsers.email,
      displayName: userProfiles.displayName,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
    .limit(100);

  if (teamMembers.length === 0) {
    return "Not sent, no team members found";
  }

  const resend = new Resend(env.RESEND_API_KEY);

  const emailPromises = teamMembers.map(async (member) => {
    if (!member.email) return { success: false, reason: "No email address" };

    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: member.email,
        subject: `VIP Customer: ${customerName}`,
        react: VipNotificationEmail({
          customerName,
          customerEmail: conversation.emailFrom!,
          originalMessage,
          replyMessage,
          conversationLink,
          customerLinks,
          closed: conversation.status === "closed",
          closedBy,
        }),
      });
      return { success: true };
    } catch (error) {
      captureExceptionAndLog(error);
      return { success: false, error };
    }
  });

  const emailResults = await Promise.all(emailPromises);

  return {
    sent: true,
    emailsSent: emailResults.filter((r) => r.success).length,
    totalRecipients: teamMembers.length,
  };
}

export const notifyVipMessage = async ({ messageId }: { messageId: number }) => {
  const message = assertDefinedOrRaiseNonRetriableError(await fetchConversationMessage(messageId));
  return await handleVipEmailNotification(message);
};

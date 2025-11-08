import { eq, isNull, sql } from "drizzle-orm";
import { htmlToText } from "html-to-text";
import { Resend } from "resend";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes, platformCustomers, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getBasicProfileById } from "@/lib/data/user";
import { VipNotificationEmail } from "@/lib/emails/vipNotification";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

type MessageWithConversationAndMailbox = typeof conversationMessages.$inferSelect & {
  conversation: typeof conversations.$inferSelect;
};

// Local copy of cleaned-up text helpers (avoid importing conversationMessage.ts which pulls in server-only modules)
const generateCleanedUpText = (html: string) => {
  if (!html?.trim()) return "";
  const paragraphs = htmlToText(html, {
    formatters: {
      image: (elem, _walk, builder) =>
        builder.addInline(`![${elem.attribs?.alt || "image"}](${elem.attribs?.src})`, { noWordTransform: true }),
    },
    wordwrap: false,
  })
    .split(/\s*\n\s*/)
    .filter((p) => p.trim().replace(/\s+/g, " "));
  return paragraphs.join("\n\n");
};

const ensureCleanedUpTextLocal = async (m: typeof conversationMessages.$inferSelect) => {
  if (m.cleanedUpText !== null) return m.cleanedUpText;
  const cleaned = generateCleanedUpText(m.body ?? "");
  await db.update(conversationMessages).set({ cleanedUpText: cleaned }).where(eq(conversationMessages.id, m.id));
  return cleaned;
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
  // Inline mailbox fetch to avoid importing server-only module
  const mailbox = await db.query.mailboxes.findFirst({
    where: isNull(sql`${mailboxes.preferences}->>'disabled'`),
  });
  assertDefinedOrRaiseNonRetriableError(mailbox);

  if (conversation.isPrompt) return "Not sent, prompt conversation";
  if (!conversation.emailFrom) return "Not sent, anonymous conversation";
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) return "Not sent, email not configured";

  // Inline platform customer fetch logic to avoid indirect server-only mailbox import
  const platformCustomerRecord = await db.query.platformCustomers.findFirst({
    where: eq(platformCustomers.email, conversation.emailFrom),
  });
  const numericValue = platformCustomerRecord?.value != null ? Number(platformCustomerRecord.value) : null;
  const vipThreshold = mailbox?.vipThreshold ?? 0;
  const isVip = numericValue != null ? numericValue / 100 >= vipThreshold : false;
  if (!isVip) return "Not sent, not a VIP customer";

  const customerName = platformCustomerRecord?.name ?? conversation.emailFrom ?? "Unknown";
  const conversationLink = `${env.AUTH_URL}/conversations?id=${conversation.slug}`;
  const customerLinks = platformCustomerRecord?.links
    ? Object.entries(platformCustomerRecord.links).map(([key, value]) => ({ label: key, url: value }))
    : undefined;

  let originalMessage = "";
  let replyMessage: string | undefined;
  let closedBy: string | undefined;

  if (message.role !== "user" && message.responseToId) {
    const originalMsg = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, message.responseToId),
    });
    if (!originalMsg) return "Not sent, original message not found";

    originalMessage = await ensureCleanedUpTextLocal(originalMsg);
    replyMessage = await ensureCleanedUpTextLocal(message);
    if (message.userId) {
      const user = await getBasicProfileById(message.userId);
      closedBy = user?.displayName || user?.email || undefined;
    }
  } else if (message.role === "user") {
    originalMessage = await ensureCleanedUpTextLocal(message);
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

  if (teamMembers.length === 0) return "Not sent, no team members found";

  const resend = new Resend(env.RESEND_API_KEY);
  const emailPromises = teamMembers.map(async (member) => {
    if (!member.email) return { success: false, reason: "No email address" } as const;
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
      return { success: true } as const;
    } catch (error) {
      captureExceptionAndLog(error);
      return { success: false, error } as const;
    }
  });

  const emailResults = await Promise.all(emailPromises);
  return {
    sent: true as const,
    emailsSent: emailResults.filter((r) => r.success).length,
    totalRecipients: teamMembers.length,
  };
}

export const notifyVipMessageEmail = async ({ messageId }: { messageId: number }) => {
  const message = assertDefinedOrRaiseNonRetriableError(await fetchConversationMessage(messageId));
  return await handleVipEmailNotification(message);
};

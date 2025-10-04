import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, conversations, gmailSupportEmails } from "@/db/schema";
import { getMailbox } from "@/lib/data/mailbox";
import { getGmailService, getMessageMetadataById, sendGmailEmail } from "@/lib/gmail/client";
import { convertConversationMessageToRaw } from "@/lib/gmail/lib";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

const markSent = async (emailId: number) => {
  await db.update(conversationMessages).set({ status: "sent" }).where(eq(conversationMessages.id, emailId));
  return null;
};

const markFailed = async (emailId: number, conversationId: number, error: string) => {
  await db.transaction(async (tx) => {
    await tx.update(conversationMessages).set({ status: "failed" }).where(eq(conversationMessages.id, emailId));
    await tx.update(conversations).set({ status: "open" }).where(eq(conversations.id, conversationId));
  });
  return error;
};

export const postEmailToGmail = async ({ messageId: emailId }: { messageId: number }) => {
  const email = await db.query.conversationMessages.findFirst({
    where: and(
      eq(conversationMessages.id, emailId),
      eq(conversationMessages.status, "queueing"),
      isNull(conversationMessages.deletedAt),
    ),
    with: {
      files: true,
      conversation: true,
    },
  });
  if (!email) {
    return null;
  }

  const conversation = email.conversation;
  if (!conversation) {
    return await markFailed(emailId, email.conversationId, "Conversation not found.");
  }

  if (conversation.lastReadAt && email.createdAt && conversation.lastReadAt > email.createdAt) {
    return await markSent(emailId);
  }

  const mailbox = await getMailbox();
  const gmailSupportEmail = mailbox?.gmailSupportEmailId
    ? await db.query.gmailSupportEmails.findFirst({
        where: eq(gmailSupportEmails.id, mailbox.gmailSupportEmailId),
      })
    : null;

  if (!gmailSupportEmail) {
    return await markFailed(emailId, email.conversationId, "The mailbox does not have a connected Gmail account.");
  }

  try {
    const pastThreadEmail = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.conversationId, email.conversationId),
        isNotNull(conversationMessages.gmailThreadId),
        isNull(conversationMessages.deletedAt),
      ),
      orderBy: desc(conversationMessages.createdAt),
    });

    const gmailService = getGmailService(gmailSupportEmail);
    const gmailSupportEmailAddress = gmailSupportEmail.email;
    if (!gmailSupportEmailAddress) {
      return await markFailed(emailId, email.conversationId, "The Gmail support email address is missing.");
    }

    if (!conversation.emailFrom) {
      return await markSent(emailId);
    }

    const rawEmail = await convertConversationMessageToRaw(
      { ...email, conversation: { ...conversation, emailFrom: conversation.emailFrom } },
      gmailSupportEmailAddress,
    );
    const response = await sendGmailEmail(gmailService, rawEmail, pastThreadEmail?.gmailThreadId ?? null);
    if (response.status < 200 || response.status >= 300) {
      return await markFailed(emailId, email.conversationId, `Failed to post to Gmail: ${response.statusText}`);
    }
    const sentEmail = await getMessageMetadataById(
      gmailService,
      assertDefinedOrRaiseNonRetriableError(response.data.id),
    );
    const sentEmailHeaders = sentEmail?.data?.payload?.headers ?? [];

    await db
      .update(conversationMessages)
      .set({
        gmailMessageId: response.data.id,
        gmailThreadId: response.data.threadId,
        messageId: sentEmailHeaders.find((header) => header.name?.toLowerCase() === "message-id")?.value ?? null,
        references: sentEmailHeaders.find((header) => header.name?.toLowerCase() === "references")?.value ?? null,
      })
      .where(eq(conversationMessages.id, emailId));

    const result = await markSent(emailId);

    return result;
  } catch (e) {
    captureExceptionAndThrowIfDevelopment(e);
    return await markFailed(emailId, email.conversationId, `Unexpected error: ${e}`);
  }
};

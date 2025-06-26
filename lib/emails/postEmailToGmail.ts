import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { markFailed, markSent } from "@/jobs/utils/emailStatus";
import { getGmailService, getMessageMetadataById, sendGmailEmail } from "@/lib/gmail/client";
import { convertConversationMessageToRaw } from "@/lib/gmail/lib";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";

export const postEmailToGmail = async (email: any, emailId: number) => {
  try {
    const pastThreadEmail = await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.conversationId, email.conversationId),
        isNotNull(conversationMessages.gmailThreadId),
        isNull(conversationMessages.deletedAt),
      ),
      orderBy: desc(conversationMessages.createdAt),
    });

    const gmailService = getGmailService(email.conversation.mailbox.gmailSupportEmail);
    const gmailSupportEmailAddress = email.conversation.mailbox.gmailSupportEmail.email;

    const rawEmail = await convertConversationMessageToRaw(
      { ...email, conversation: { ...email.conversation, emailFrom: email.conversation.emailFrom } },
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

    return await markSent(emailId);
  } catch (e) {
    captureExceptionAndThrowIfDevelopment(e);
    return await markFailed(emailId, email.conversationId, `Unexpected error: ${e}`);
  }
};

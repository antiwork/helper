import { and, eq, isNull } from "drizzle-orm";
import { Resend } from "resend";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import ConversationReplyEmail from "@/lib/emails/conversationReply";
import { env } from "@/lib/env";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";

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

export const postEmailToResend = async ({ messageId: emailId }: { messageId: number }) => {
  const email = await db.query.conversationMessages.findFirst({
    where: and(
      eq(conversationMessages.id, emailId),
      eq(conversationMessages.status, "queueing"),
      isNull(conversationMessages.deletedAt),
    ),
    with: {
      conversation: {
        with: {
          mailbox: {
            columns: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!email) {
    return null;
  }

  try {
    if (!email.conversation.emailFrom) {
      return await markFailed(emailId, email.conversationId, "The conversation emailFrom is missing.");
    }

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      return await markFailed(emailId, email.conversationId, "Resend is not configured.");
    }

    const resend = new Resend(env.RESEND_API_KEY);

    const subject = email.conversation.subject ? `Re: ${email.conversation.subject}` : "Reply from Helper";

    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_ADDRESS,
      to: email.conversation.emailFrom,
      subject,
      react: ConversationReplyEmail({
        content: email.body ?? "",
        subject,
        isFromAI: email.role === "ai_assistant",
      }),
    });

    if (error) {
      return await markFailed(emailId, email.conversationId, `Failed to send via Resend: ${error.message}`);
    }

    return await markSent(emailId);
  } catch (e) {
    captureExceptionAndThrowIfDevelopment(e);
    return await markFailed(emailId, email.conversationId, `Unexpected error: ${e}`);
  }
};

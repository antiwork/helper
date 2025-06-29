import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { postEmailToGmail } from "@/lib/emails/postEmailToGmail";
import { postEmailToResend } from "@/lib/emails/postEmailToResend";
import { env } from "@/lib/env";
import { markFailed } from "./utils/emailStatus";

export const sendEmail = async ({ messageId: emailId }: { messageId: number }) => {
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
              widgetHost: true,
            },
            with: {
              gmailSupportEmail: true,
            },
          },
        },
      },
      files: true,
    },
  });

  if (!email) {
    return null;
  }

  if (!email.conversation.emailFrom) {
    return await markFailed(emailId, email.conversationId, "The conversation emailFrom is missing.");
  }

  if (email.conversation.mailbox.gmailSupportEmail) {
    return await postEmailToGmail(email, emailId);
  } else if (env.RESEND_API_KEY && env.RESEND_FROM_ADDRESS) {
    return await postEmailToResend(email, emailId);
  }
  return await markFailed(emailId, email.conversationId, "No email sending method configured (Gmail or Resend).");
};

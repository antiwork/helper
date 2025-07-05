import { Resend } from "resend";
import { markFailed, markSent } from "@/jobs/utils/emailStatus";
import AIReplyEmail from "@/lib/emails/aiReply";
import { env } from "@/lib/env";
import { captureExceptionAndThrowIfDevelopment } from "@/lib/shared/sentry";

export const postEmailToResend = async (email: any, emailId: number) => {
  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      return await markFailed(emailId, email.conversationId, "Resend is not configured.");
    }

    const resend = new Resend(env.RESEND_API_KEY);

    const subject = email.conversation.subject ? `Re: ${email.conversation.subject}` : "Reply from Helper";

    const { error } = await resend.emails.send({
      from: env.RESEND_FROM_ADDRESS,
      to: email.conversation.emailFrom,
      subject,
      react: AIReplyEmail({
        content: email.body ?? "",
      }),
    });

    if (error) {
      captureExceptionAndThrowIfDevelopment(error);
      return await markFailed(emailId, email.conversationId, `Failed to send via Resend: ${error.message}`);
    }

    return await markSent(emailId);
  } catch (e) {
    captureExceptionAndThrowIfDevelopment(e);
    return await markFailed(emailId, email.conversationId, `Unexpected error: ${e}`);
  }
};

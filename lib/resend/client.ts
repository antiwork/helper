import type { ReactElement } from "react";
import { Resend } from "resend";
import { env } from "@/lib/env";

export type EmailSendResult = { success: true } | { success: false; email?: string; error?: unknown };

export const sentEmailViaResend = async ({
  memberList,
  subject,
  react,
}: {
  memberList: { email: string }[];
  subject: string;
  react: ReactElement;
}): Promise<EmailSendResult[]> => {
  const resend = new Resend(env.RESEND_API_KEY);

  const emailPromises = memberList.map(async (member) => {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: member.email,
        subject,
        react,
      });
      return { success: true };
    } catch (error) {
      return { success: false, email: member.email, error } as const;
    }
  });
  const emailResults = await Promise.all(emailPromises);
  return emailResults;
};

import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { gmailSupportEmails, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { getGmailService, subscribeToMailbox } from "@/lib/gmail/client";

export const renewMailboxWatches = async () => {
  const supportEmails = await db
    .select({
      accessToken: gmailSupportEmails.accessToken,
      refreshToken: gmailSupportEmails.refreshToken,
      clerkUserId: gmailSupportEmails.clerkUserId,
    })
    .from(mailboxes)
    .innerJoin(gmailSupportEmails, eq(mailboxes.gmailSupportEmailId, gmailSupportEmails.id));

  for (const supportEmail of supportEmails) {
    try {
      await subscribeToMailbox(await getGmailService(supportEmail));
    } catch (error) {
      Sentry.captureException(error);
    }
  }
};

export default inngest.createFunction(
  { id: "renew-mailbox-watches" },
  { cron: "0 0 * * *" }, // Every day at midnight
  ({ step }) => step.run("process", () => renewMailboxWatches()),
);

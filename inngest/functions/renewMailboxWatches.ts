import * as Sentry from "@sentry/nextjs";
import dayjs from "dayjs";
import { eq, gt, inArray, or } from "drizzle-orm";
import { db } from "@/db/client";
import { gmailSupportEmails, mailboxes, subscriptions } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { FREE_TRIAL_PERIOD_DAYS } from "@/lib/auth/account";
import { ADDITIONAL_PAID_ORGANIZATION_IDS } from "@/lib/data/organization";
import { getGmailService, subscribeToMailbox } from "@/lib/gmail/client";

export const renewMailboxWatches = async () => {
  const supportEmails = await db
    .select({
      accessToken: gmailSupportEmails.accessToken,
      refreshToken: gmailSupportEmails.refreshToken,
      clerkUserId: gmailSupportEmails.clerkUserId,
    })
    .from(mailboxes)
    .innerJoin(gmailSupportEmails, eq(mailboxes.gmailSupportEmailId, gmailSupportEmails.id))
    .leftJoin(subscriptions, eq(subscriptions.clerkOrganizationId, mailboxes.clerkOrganizationId))
    .where(
      or(
        eq(subscriptions.status, "active"),
        gt(mailboxes.createdAt, dayjs().subtract(FREE_TRIAL_PERIOD_DAYS, "day").toDate()),
        inArray(mailboxes.clerkOrganizationId, ADDITIONAL_PAID_ORGANIZATION_IDS),
      ),
    );

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

import dayjs from "dayjs";
import { eq } from "drizzle-orm";
import { NonRetriableError } from "inngest";
import { db } from "@/db/client";
import { mailboxes, subscriptions } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { FREE_TRIAL_PERIOD_DAYS } from "@/lib/auth/account";
import { getClerkOrganization, getOrganizationAdminUsers, setPrivateMetadata } from "@/lib/data/organization";
import TrialExpiredEmail from "@/lib/emails/trialExpired";
import { sendEmail } from "@/lib/resend/client";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

export default inngest.createFunction(
  {
    id: "setup-new-organization",
    retries: 1,
  },
  { event: "organization/created" },
  async ({ event, step }) => {
    const freeTrialEndsAt = await step.run("set-metadata", async () => {
      const organization = await getClerkOrganization(event.data.organizationId);
      if (!organization.privateMetadata.freeTrialEndsAt) {
        const freeTrialEndsAt = dayjs().add(FREE_TRIAL_PERIOD_DAYS, "day").toDate();
        await setPrivateMetadata(event.data.organizationId, {
          automatedRepliesCount: 0,
          freeTrialEndsAt,
        });
        return freeTrialEndsAt;
      }
      return organization.privateMetadata.freeTrialEndsAt;
    });

    await step.sleepUntil("wait-until-trial-ends", new Date(freeTrialEndsAt));

    await step.run("send-trial-expired-email", async () => {
      await sendTrialExpiredEmail(event.data.organizationId);
    });
  },
);

export const sendTrialExpiredEmail = async (organizationId: string) => {
  const organization = await getClerkOrganization(organizationId);

  const organizationMailboxes = await db.query.mailboxes.findMany({
    where: eq(mailboxes.clerkOrganizationId, organizationId),
  });

  const organizationSubscriptions = await db.query.subscriptions.findMany({
    where: eq(subscriptions.clerkOrganizationId, organizationId),
  });

  if (organization.privateMetadata.trialExpiredNotificationSentAt) {
    throw new NonRetriableError(`Trial expired notification already sent for organization ${organizationId}`);
  } else if (organizationSubscriptions.length > 0) {
    return { message: `Organization ${organizationId} has a subscription record` };
  }

  const mailboxSlug = organizationMailboxes.sort(({ id }) => id)[0]?.slug;

  for (const admin of await getOrganizationAdminUsers(organizationId)) {
    await sendEmail({
      from: "Helper <help@helper.ai>",
      to: [assertDefinedOrRaiseNonRetriableError(admin.emailAddresses[0]?.emailAddress)],
      subject: "Your Helper free trial has ended",
      react: TrialExpiredEmail({ mailboxSlug }),
    });
  }

  await setPrivateMetadata(organizationId, { trialExpiredNotificationSentAt: new Date().toISOString() });
};

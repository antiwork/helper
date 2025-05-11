import crypto from "crypto";
import { ExternalAccount, Organization, User } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db, Transaction } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { addMember } from "@/lib/data/organization";
import { getOAuthAccessToken } from "@/lib/data/user";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";
import { getSlackTeam } from "@/lib/slack/client";

export const FREE_TRIAL_PERIOD_DAYS = 30;
export const WIDGET_HMAC_SECRET_PREFIX = "hlpr_widget_";

export const createInitialMailbox = async (tx: Transaction, user: User, organization: Organization) => {
  const mailbox = await tx
    .insert(mailboxes)
    .values({
      name: organization.name.replace("Organization", "Inbox"),
      slug: assertDefined(organization.slug),
      clerkOrganizationId: organization.id,
      promptUpdatedAt: new Date(),
      widgetHMACSecret: `${WIDGET_HMAC_SECRET_PREFIX}${crypto.randomBytes(16).toString("hex")}`,
    })
    .returning()
    .then(takeUniqueOrThrow);

  return mailbox;
};

export const createNewSlackTeamMember = async (user: User, externalAccount: ExternalAccount) => {
  try {
    const userToken = await getOAuthAccessToken(user.id, "oauth_slack");
    if (!userToken) return false;
    const slackTeam = await getSlackTeam(userToken);
    if (!slackTeam?.id) return false;

    const mailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.slackTeamId, slackTeam.id),
    });

    if (!mailbox?.clerkOrganizationId) return false;

    await addMember(mailbox.clerkOrganizationId, user.id);
    return true;
  } catch (e) {
    captureExceptionAndLogIfDevelopment(e);
    return false;
  }
};

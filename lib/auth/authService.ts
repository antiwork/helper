import { Organization, User } from "@clerk/nextjs/server";
import { db } from "@/db/client";
import { inngest } from "@/inngest/client";
import { createGmailSupportEmail } from "@/lib/data/gmailSupportEmail";
import { updateUserMailboxData } from "@/lib/data/user";
import { getGmailService, subscribeToMailbox } from "@/lib/gmail/client";
import { captureExceptionAndLog, captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";
import { createInitialMailbox } from "./account";
import { GMAIL_SCOPES } from "./constants";

export const setupOrganizationForNewUser = async (organization: Organization, user: User) => {
  const googleAccount = user.externalAccounts.find(({ provider }) => provider === "oauth_google");

  const { mailbox, gmailSupportEmail } = await db.transaction(async (tx) => {
    const mailbox = await createInitialMailbox(tx, user, organization);

    const gmailSupportEmail = googleAccount
      ? await createGmailSupportEmail(mailbox.slug, { email: googleAccount.emailAddress, clerkUserId: user.id }, tx)
      : null;

    return { mailbox, gmailSupportEmail };
  });

  if (gmailSupportEmail) {
    await inngest.send({
      name: "gmail/import-recent-threads",
      data: {
        gmailSupportEmailId: gmailSupportEmail.id,
      },
    });

    try {
      const client = await getGmailService(gmailSupportEmail);
      await subscribeToMailbox(client);
    } catch (e) {
      captureExceptionAndLogIfDevelopment(e);
    }
  }

  await updateUserMailboxData(user.id, mailbox.id, {
    role: "core",
    keywords: [],
  });

  return mailbox;
};

export const gmailScopesGranted = (scopes: string[]) => {
  const missingScopes = GMAIL_SCOPES.filter((s) => !scopes.includes(s));
  if (missingScopes.length) {
    captureExceptionAndLog(new Error(`Missing scopes: ${missingScopes.join(", ")}`));
    return false;
  }
  return true;
};

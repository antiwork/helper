import crypto from "crypto";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { DbOrAuthUser } from "@/db/supabaseSchema/auth";
import { updateUserMailboxData } from "@/lib/data/user";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { GMAIL_SCOPES } from "./constants";

const WIDGET_HMAC_SECRET_PREFIX = "hlpr_widget_";

export const setupMailboxForNewUser = async (user: DbOrAuthUser) => {
  // TODO
  // const googleAccount = user.externalAccounts.find(({ provider }) => provider === "oauth_google");
  const googleAccount = null;

  const { mailbox, gmailSupportEmail } = await db.transaction(async (tx) => {
    const mailbox = await createInitialMailbox(tx);

    // const gmailSupportEmail = googleAccount
    //   ? await createGmailSupportEmail(mailbox.slug, { email: googleAccount.emailAddress, clerkUserId: user.id }, tx)
    //   : null;
    const gmailSupportEmail = null;

    return { mailbox, gmailSupportEmail };
  });

  // if (gmailSupportEmail) {
  //   await inngest.send({
  //     name: "gmail/import-recent-threads",
  //     data: {
  //       gmailSupportEmailId: gmailSupportEmail.id,
  //     },
  //   });

  //   try {
  //     const client = await getGmailService(gmailSupportEmail);
  //     await subscribeToMailbox(client);
  //   } catch (e) {
  //     captureExceptionAndLogIfDevelopment(e);
  //   }
  // }

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

const createInitialMailbox = async (tx: Transaction) => {
  const mailbox = await tx
    .insert(mailboxes)
    .values({
      name: "Mailbox",
      slug: "mailbox",
      clerkOrganizationId: "",
      promptUpdatedAt: new Date(),
      widgetHMACSecret: `${WIDGET_HMAC_SECRET_PREFIX}${crypto.randomBytes(16).toString("hex")}`,
    })
    .returning()
    .then(takeUniqueOrThrow);

  return mailbox;
};

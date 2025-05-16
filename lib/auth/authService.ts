import crypto from "crypto";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { DbOrAuthUser } from "@/db/supabaseSchema/auth";
import { updateUserMailboxData } from "@/lib/data/user";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { GMAIL_SCOPES } from "./constants";

const WIDGET_HMAC_SECRET_PREFIX = "hlpr_widget_";

export const setupMailboxForNewUser = async (user: DbOrAuthUser) => {
  const mailbox = await createInitialMailbox();
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

const createInitialMailbox = async () => {
  const mailbox = await db
    .insert(mailboxes)
    .values({
      name: "Mailbox",
      slug: "mailbox",
      promptUpdatedAt: new Date(),
      widgetHMACSecret: `${WIDGET_HMAC_SECRET_PREFIX}${crypto.randomBytes(16).toString("hex")}`,
    })
    .returning()
    .then(takeUniqueOrThrow);

  return mailbox;
};

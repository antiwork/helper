import crypto from "crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { MailboxTheme } from "@/lib/themes";

export type WidgetSessionPayload = {
  email?: string;
  mailboxSlug: string;
  showWidget: boolean;
  isAnonymous: boolean;
  isWhitelabel: boolean;
  theme?: MailboxTheme;
  title?: string;
  anonymousSessionId?: string;
};

const getMailboxJwtSecret = async (mailboxSlug: string): Promise<string> => {
  const mailboxRecord = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.slug, mailboxSlug),
    columns: {
      widgetHMACSecret: true,
    },
  });

  if (!mailboxRecord?.widgetHMACSecret) {
    throw new Error(`Mailbox ${mailboxSlug} not found or missing widgetHMACSecret`);
  }

  return mailboxRecord.widgetHMACSecret;
};

export async function createWidgetSession(
  payload: Omit<WidgetSessionPayload, "isAnonymous" | "email"> & {
    email?: string;
    isWhitelabel: boolean;
  },
  currentToken?: string | null,
): Promise<string> {
  let anonymousSessionId: string | undefined;
  if (currentToken) {
    try {
      const decoded = await verifyWidgetSession(currentToken);
      if (decoded.mailboxSlug === payload.mailboxSlug) anonymousSessionId = decoded.anonymousSessionId;
    } catch (e) {
      captureExceptionAndLog(e);
    }
  }
  const isAnonymous = !payload.email;
  const secret = await getMailboxJwtSecret(payload.mailboxSlug);
  return jwt.sign(
    {
      ...payload,
      isAnonymous,
      anonymousSessionId: isAnonymous ? (anonymousSessionId ?? crypto.randomUUID()) : undefined,
    },
    secret,
    { expiresIn: isAnonymous ? "7d" : "12h" },
  );
}

export async function verifyWidgetSession(token: string): Promise<WidgetSessionPayload> {
  try {
    const decoded = jwt.decode(token) as WidgetSessionPayload;
    if (!decoded?.mailboxSlug) {
      throw new Error("Invalid token: missing mailboxSlug");
    }
    
    const secret = await getMailboxJwtSecret(decoded.mailboxSlug);
    const verified = jwt.verify(token, secret) as WidgetSessionPayload;
    return verified;
  } catch (e) {
    throw new Error("Invalid or expired token", { cause: e });
  }
}

export const getEmailHash = async (email: string, mailboxSlug: string, timestamp: number) => {
  const mailboxRecord = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.slug, mailboxSlug),
    columns: {
      widgetHMACSecret: true,
    },
  });

  if (!mailboxRecord?.widgetHMACSecret) return null;

  return crypto.createHmac("sha256", mailboxRecord.widgetHMACSecret).update(`${email}:${timestamp}`).digest("hex");
};

import crypto from "crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
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

export function createWidgetSession(
  mailbox: Pick<Mailbox, "slug" | "widgetHMACSecret" | "isWhitelabel" | "preferences" | "name">,
  {
    email,
    showWidget,
    currentToken,
  }: {
    email?: string;
    showWidget: boolean;
    currentToken?: string | null;
  },
) {
  let anonymousSessionId: string | undefined;
  if (currentToken) {
    try {
      const decoded = verifyWidgetSession(currentToken, mailbox);
      if (decoded.mailboxSlug === mailbox.slug) anonymousSessionId = decoded.anonymousSessionId;
    } catch (e) {
      captureExceptionAndLog(e);
    }
  }
  const isAnonymous = !email;
  return jwt.sign(
    {
      email,
      showWidget,
      mailboxSlug: mailbox.slug,
      isWhitelabel: mailbox.isWhitelabel ?? false,
      theme: mailbox.preferences?.theme,
      title: mailbox.name,
      isAnonymous,
      anonymousSessionId: isAnonymous ? (anonymousSessionId ?? crypto.randomUUID()) : undefined,
    },
    mailbox.widgetHMACSecret,
    { expiresIn: isAnonymous ? "7d" : "12h" },
  );
}

export function verifyWidgetSession(
  token: string,
  mailbox: Pick<Mailbox, "slug" | "widgetHMACSecret">,
): WidgetSessionPayload {
  const decoded = jwt.decode(token) as WidgetSessionPayload;
  if (decoded?.mailboxSlug !== mailbox.slug) {
    throw new Error("Invalid token: mailboxSlug mismatch");
  }

  try {
    const verified = jwt.verify(token, mailbox.widgetHMACSecret) as WidgetSessionPayload;
    return verified;
  } catch (e) {
    try {
      const verified = jwt.verify(token, env.WIDGET_JWT_SECRET) as WidgetSessionPayload;
      return verified;
    } catch (fallbackError) {
      throw new Error("Invalid or expired token", { cause: e });
    }
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

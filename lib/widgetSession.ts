import crypto from "crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export type WidgetSessionPayload = {
  email?: string;
  mailboxSlug: string;
  showWidget: boolean;
  isAnonymous: boolean;
  isWhitelabel: boolean;
  title?: string;
  anonymousSessionId?: string;
};

export function createWidgetSession(
  mailbox: Pick<Mailbox, "slug" | "widgetHMACSecret" | "isWhitelabel" | "name">,
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

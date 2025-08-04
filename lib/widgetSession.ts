import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "@/db/client";
import { Mailbox } from "@/lib/data/mailbox";

export type WidgetSessionPayload = {
  email?: string;
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
    email?: string | null;
    showWidget: boolean;
    currentToken?: string | null;
  },
) {
  let anonymousSessionId: string | undefined;
  if (currentToken) {
    try {
      const decoded = verifyWidgetSession(currentToken, mailbox);
      anonymousSessionId = decoded.anonymousSessionId;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Invalid previous session token", e);
    }
  }
  const isAnonymous = !email;
  return jwt.sign(
    {
      email,
      showWidget,
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
  try {
    const verified = jwt.verify(token, mailbox.widgetHMACSecret) as WidgetSessionPayload;
    return verified;
  } catch (e) {
    throw new Error("Invalid or expired token", { cause: e });
  }
}

export const getEmailHash = async (email: string, timestamp: number) => {
  const mailboxRecord = await db.query.mailboxes.findFirst({
    columns: {
      widgetHMACSecret: true,
    },
  });

  if (!mailboxRecord?.widgetHMACSecret) return null;

  return crypto.createHmac("sha256", mailboxRecord.widgetHMACSecret).update(`${email}:${timestamp}`).digest("hex");
};

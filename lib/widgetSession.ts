import crypto from "crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { env } from "@/lib/env";
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

const jwtSecret = () => {
  const secret = env.WIDGET_JWT_SECRET;
  if (!secret) {
    throw new Error("WIDGET_JWT_SECRET is not set");
  }
  return secret;
};

export function createWidgetSession(
  payload: Omit<WidgetSessionPayload, "isAnonymous" | "email"> & {
    email?: string;
    isWhitelabel: boolean;
    anonymousSessionId?: string;
  },
): string {
  const isAnonymous = !payload.email;
  return jwt.sign({ ...payload, isAnonymous }, jwtSecret(), { expiresIn: "12h" });
}

export function verifyWidgetSession(token: string): WidgetSessionPayload {
  try {
    const decoded = jwt.verify(token, jwtSecret()) as WidgetSessionPayload;
    return decoded;
  } catch {
    throw new Error("Invalid or expired token");
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

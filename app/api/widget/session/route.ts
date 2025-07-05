import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { fetchAndUpdateUnsentNotifications } from "@/lib/data/messageNotifications";
import { getPlatformCustomer, upsertPlatformCustomer } from "@/lib/data/platformCustomer";
import { createWidgetSession, getEmailHash } from "@/lib/widgetSession";
import { corsOptions, corsResponse } from "../utils";

const requestSchema = z.object({
  email: z.string().email().optional(),
  emailHash: z.string().min(1).optional(),
  mailboxSlug: z.string().min(1),
  timestamp: z.number().int().positive().optional(),
  customerMetadata: z
    .object({
      value: z.number().nullish(),
      name: z.string().nullish(),
      links: z.record(z.string()).nullish(),
    })
    .nullish(),
  experimentalReadPage: z.boolean().nullish(),
  currentToken: z.string().nullish(),
});

// 1 hour
const CLOCK_SKEW_TOLERANCE_MS = 60 * 60 * 1000;

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = requestSchema.safeParse(body);

  if (!result.success) {
    return corsResponse({ error: "Invalid request parameters" }, { status: 400 });
  }

  const { email, emailHash, mailboxSlug, timestamp, customerMetadata, experimentalReadPage, currentToken } =
    result.data;

  const mailboxRecord = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.slug, mailboxSlug),
    columns: {
      id: true,
      slug: true,
      widgetDisplayMode: true,
      widgetDisplayMinValue: true,
      isWhitelabel: true,
      preferences: true,
      name: true,
      widgetHMACSecret: true,
    },
  });

  if (!mailboxRecord) {
    return corsResponse({ error: "Invalid mailbox" }, { status: 400 });
  }

  let platformCustomer = null;
  let showWidget = mailboxRecord.widgetDisplayMode === "always";

  // Only perform email-related checks if email is provided
  if (email) {
    if (!timestamp || !emailHash) {
      return corsResponse({ error: "Email authentication fields missing" }, { status: 400 });
    }

    const timestampDate = new Date(timestamp);
    if (Math.abs(timestampDate.getTime() - Date.now()) > CLOCK_SKEW_TOLERANCE_MS) {
      return corsResponse({ valid: false, error: "Timestamp is too far in the past" }, { status: 401 });
    }

    const computedHmac = await getEmailHash(email, mailboxSlug, timestamp);
    if (!computedHmac || computedHmac !== emailHash) {
      return corsResponse({ valid: false, error: "Invalid HMAC signature" }, { status: 401 });
    }

    if (customerMetadata) {
      await upsertPlatformCustomer({
        email,
        customerMetadata,
      });
    }

    platformCustomer = await getPlatformCustomer(email);

    showWidget =
      mailboxRecord.widgetDisplayMode === "always" ||
      (mailboxRecord.widgetDisplayMode === "revenue_based" &&
        platformCustomer?.value &&
        mailboxRecord.widgetDisplayMinValue != null &&
        Number(platformCustomer.value) / 100 >= mailboxRecord.widgetDisplayMinValue) ||
      false;
  }

  const token = createWidgetSession(mailboxRecord, { email, showWidget, currentToken });

  let notifications;
  if (platformCustomer) {
    notifications = await fetchAndUpdateUnsentNotifications(platformCustomer);
  }

  return corsResponse({
    valid: true,
    token,
    showWidget,
    notifications,
    experimentalReadPage,
  });
}

import { CreateSessionResult, sessionParamsSchema } from "@helperai/client";
import { db } from "@/db/client";
import { fetchAndUpdateUnsentNotifications } from "@/lib/data/messageNotifications";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { env } from "@/lib/env";
import { createWidgetSession, getEmailHash } from "@/lib/widgetSession";
import { corsOptions, corsResponse } from "../utils";

// 1 hour
const CLOCK_SKEW_TOLERANCE_MS = 60 * 60 * 1000;

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  const body = await request.json();
  const result = sessionParamsSchema.safeParse(body);

  if (!result.success) {
    return corsResponse({ error: "Invalid request parameters" }, { status: 400 });
  }

  const { email, emailHash, timestamp, currentToken } = result.data;

  const mailboxRecord = await db.query.mailboxes.findFirst({
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

    const computedHmac = await getEmailHash(email, timestamp);
    if (!computedHmac || computedHmac !== emailHash) {
      return corsResponse({ valid: false, error: "Invalid HMAC signature" }, { status: 401 });
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

  // TODO: update result type and remove unnecesary fields
  return corsResponse<
    CreateSessionResult & { valid: true; showWidget: boolean; notifications: any; experimentalReadPage?: boolean }
  >({
    valid: true,
    token,
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    showWidget,
    notifications,
    experimentalReadPage: body.experimentalReadPage,
  });
}

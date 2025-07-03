import * as Sentry from "@sentry/nextjs";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { getMailbox } from "@/lib/data/mailbox";
import { getSlackAccessToken } from "@/lib/slack/client";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const state = JSON.parse(request.nextUrl.searchParams.get("state") || "{}");
  const code = request.nextUrl.searchParams.get("code");
  const redirectUrl = new URL(`${getBaseUrl()}/mailboxes/${state.mailbox_slug}/settings`);

  if (!code) {
    return NextResponse.redirect(`${redirectUrl}/integrations?slackConnectResult=error`);
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${redirectUrl}/integrations?slackConnectResult=error`);
  }

  try {
    const mailbox = await getMailbox();
    if (!mailbox) {
      return NextResponse.redirect(`${redirectUrl}/integrations?slackConnectResult=error`);
    }
    const { teamId, botUserId, accessToken } = await getSlackAccessToken(code);

    if (!teamId) throw new Error("Slack team ID not found in response");

    await db
      .update(mailboxes)
      .set({
        slackTeamId: teamId,
        slackBotUserId: botUserId,
        slackBotToken: accessToken,
      })
      .where(eq(mailboxes.id, mailbox.id));

    return NextResponse.redirect(`${redirectUrl}/integrations?slackConnectResult=success`);
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.redirect(`${redirectUrl}/integrations?slackConnectResult=error`);
  }
}

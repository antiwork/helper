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
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) return NextResponse.redirect(new URL("/login", request.url));

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(new URL("/mine", request.url));
    }

    const mailbox = await getMailbox();
    if (!mailbox) {
      return NextResponse.redirect(new URL("/mine", request.url));
    }

    const redirectUrl = new URL(`${getBaseUrl()}/settings`);

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
    return NextResponse.redirect(`${getBaseUrl()}/settings/integrations?slackConnectResult=error`);
  }
}

import { SlackEvent } from "@slack/web-api";
import { waitUntil } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { disconnectSlack } from "@/lib/data/mailbox";
import { handleNewAppMention } from "@/lib/slack/agent/handleAppMention";
import { assistantThreadMessage, handleNewAssistantMessage } from "@/lib/slack/agent/handleMessages";
import { mailboxForEvent, verifySlackRequest } from "@/lib/slack/client";

export const POST = async (request: Request) => {
  const body = await request.text();
  if (!(await verifySlackRequest(body, request.headers))) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
  }

  const data = JSON.parse(body);

  if (data.type === "url_verification") {
    return NextResponse.json({ challenge: data.challenge });
  }

  if (data.type === "event_callback" && data.event.type === "tokens_revoked") {
    for (const userId of data.event.tokens.bot) {
      const mailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.slackTeamId, data.team_id) && eq(mailboxes.slackBotUserId, userId),
      });

      if (mailbox) await disconnectSlack(mailbox.id);
    }
    return new Response(null, { status: 200 });
  }

  const event = data.event as SlackEvent;
  const mailbox = await mailboxForEvent(event);

  if (!mailbox) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (event.type === "app_mention") {
    waitUntil(handleNewAppMention(event, mailbox));
    return new Response("Success!", { status: 200 });
  }

  if (event.type === "assistant_thread_started") {
    waitUntil(assistantThreadMessage(event, mailbox));
    return new Response("Success!", { status: 200 });
  }

  if (
    event.type === "message" &&
    !event.subtype &&
    event.channel_type === "im" &&
    !event.bot_id &&
    !event.bot_profile
  ) {
    waitUntil(handleNewAssistantMessage(event, mailbox));
    return new Response("Success!", { status: 200 });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
};

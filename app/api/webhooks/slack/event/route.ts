import { SlackEvent } from "@slack/web-api";
import { waitUntil } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { disconnectSlack } from "@/lib/data/mailbox";
import { findMailboxForEvent } from "@/lib/slack/agent/findMailboxForEvent";
import { handleAssistantThreadMessage, handleMessage, isAgentThread } from "@/lib/slack/agent/handleMessages";
import { handleSlackErrors, verifySlackRequest } from "@/lib/slack/client";
import { handleSlackUnfurl } from "@/lib/slack/linkUnfurl";

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

  const event = data.event as SlackEvent | undefined;
  if (!event) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (event && !("team_id" in event) && "team_id" in data) {
    (event as any).team_id = data.team_id;
  }
  if (event.type === "message" && (event.subtype || event.bot_id || event.bot_profile)) {
    // Not messages we need to handle
    return new Response("Success!", { status: 200 });
  }

  const mailboxInfo = await handleSlackErrors(findMailboxForEvent(event));
  if (!mailboxInfo?.mailboxes.length) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  if (
    event.type === "app_mention" ||
    (event.type === "message" &&
      (event.channel_type === "im" || (await handleSlackErrors(isAgentThread(event, mailboxInfo)))))
  ) {
    const currentMailbox = assertDefined(mailboxInfo.currentMailbox, "No current mailbox found");
    waitUntil(handleSlackErrors(handleMessage(event, currentMailbox)));
    return new Response("Success!", { status: 200 });
  }

  if (event.type === "assistant_thread_started") {
    waitUntil(handleSlackErrors(handleAssistantThreadMessage(event, mailboxInfo)));
    return new Response("Success!", { status: 200 });
  }
  if (event.type === "link_shared") {
    waitUntil(handleSlackErrors(handleSlackUnfurl(event)));
    return new Response("Success!", { status: 200 });
  }

  return new Response("Not handled", { status: 200 });
};

import { NextResponse } from "next/server";
import { env } from "@/env";
import { processMessage } from "@/lib/slack/agent/core";

export interface SlackEvent {
  type: string;
  bot_id?: string;
  text?: string;
  channel?: string;
  user?: string;
  thread_ts?: string;
  ts?: string;
}

export function handleMessageEvent(event: SlackEvent) {
  if (event.bot_id) {
    return NextResponse.json({ success: true });
  }

  const message = event.text || "";
  const channel = event.channel || "";
  const threadTs = event.thread_ts || event.ts;

  if (message && channel && env.SLACK_BOT_TOKEN) {
    void processMessage(message, env.SLACK_BOT_TOKEN, channel, threadTs).catch((error: unknown) => {
      console.error("Error processing message:", error);
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Missing message or channel" }, { status: 400 });
}

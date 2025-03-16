import { NextRequest, NextResponse } from "next/server";
import { env } from "@/env";
import { verifySlackRequest } from "@/lib/slack/client";
import { handleInteractiveMessage, handleMessageEvent, SlackEvent } from "@/lib/slack/webhooks";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    let payload;
    try {
      payload = JSON.parse(rawBody);
      if (payload.type === "url_verification") {
        console.log("Received Slack URL verification challenge:", payload.challenge);

        return new Response(payload.challenge, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      }
    } catch (e) {
      console.log("Not JSON, trying form data parsing");
    }

    const isValid = await verifySlackRequest(rawBody, req.headers);
    if (!isValid) {
      console.error("Invalid Slack signature");
      return NextResponse.json({ error: "Invalid request" }, { status: 401 });
    }

    if (!payload) {
      const formData = new URLSearchParams(rawBody);
      const payloadStr = formData.get("payload");

      if (payloadStr) {
        try {
          payload = JSON.parse(payloadStr);

          if (payload.type === "block_actions") {
            return handleInteractiveMessage(payload);
          }
        } catch (e) {
          console.error("Failed to parse payload JSON:", e);
        }
      } else {
        payload = Object.fromEntries(formData.entries());
      }
    }

    if (payload.event_type === "message" || payload.type === "event_callback") {
      let event: SlackEvent | null = null;

      if (typeof payload.event === "string") {
        try {
          event = JSON.parse(payload.event) as SlackEvent;
        } catch (e) {
          console.error("Failed to parse event JSON:", e);
          return NextResponse.json({ error: "Invalid event format" }, { status: 400 });
        }
      } else if (payload.event) {
        event = payload.event as unknown as SlackEvent;
      }

      if (!event) {
        return NextResponse.json({ error: "No event found" }, { status: 400 });
      }

      return handleMessageEvent(event);
    }

    return NextResponse.json({ error: "Unhandled event type" }, { status: 400 });
  } catch (error) {
    console.error("Error handling Slack webhook:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

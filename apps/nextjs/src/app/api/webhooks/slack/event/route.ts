import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { disconnectSlack } from "@/lib/data/mailbox";
import { verifySlackRequest } from "@/lib/slack/client";
import { handleSlackMention } from "@/lib/slack/mentions";

export const POST = async (request: Request) => {
  try {
    const body = await request.text();
    console.log("Received Slack event webhook:", body);

    // Parse the request body
    const data = JSON.parse(body);

    // Handle URL verification challenge
    if (data.type === "url_verification") {
      console.log("Handling URL verification challenge");
      return NextResponse.json({ challenge: data.challenge });
    }

    // Verify Slack signature for all other requests
    if (!(await verifySlackRequest(body, request.headers))) {
      console.log("Slack signature verification failed");
      return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
    }

    if (data.type === "event_callback" && data.event.type === "tokens_revoked") {
      console.log("Handling tokens_revoked event");
      for (const userId of data.event.tokens.bot) {
        const mailbox = await db.query.mailboxes.findFirst({
          where: eq(mailboxes.slackTeamId, data.team_id) && eq(mailboxes.slackBotUserId, userId),
        });

        if (mailbox) await disconnectSlack(mailbox.id);
      }
      return new Response(null, { status: 200 });
    }

    // Handle app_mention events (when someone mentions @helpme)
    if (data.type === "event_callback" && data.event.type === "app_mention") {
      console.log("Handling app_mention event:", data.event);
      const { event, team_id } = data;
      const { text, user, channel, ts } = event;

      console.log(`Looking for mailbox with team_id: ${team_id}`);
      const mailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.slackTeamId, team_id || ""),
      });

      console.log("Found mailbox:", mailbox);

      if (!mailbox?.slackBotToken) {
        console.log("No slackBotToken found for mailbox");
        return new Response(null, { status: 200 });
      }

      // Process mention in background
      void (async () => {
        try {
          console.log("Calling handleSlackMention with:", {
            text,
            userId: user,
            channelId: channel,
            messageTs: ts,
            mailboxId: mailbox.id,
          });

          await handleSlackMention({
            text,
            userId: user,
            channelId: channel,
            messageTs: ts,
            mailbox: {
              id: mailbox.id,
              slug: mailbox.slug,
              slackBotToken: mailbox.slackBotToken,
              clerkOrganizationId: mailbox.clerkOrganizationId || "",
            },
          });

          console.log("Successfully handled Slack mention");
        } catch (error) {
          console.error("Error handling Slack mention:", error);
        }
      })();

      return new Response(null, { status: 200 });
    }

    console.log("Invalid request type:", data.type);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Error in Slack event handler:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};

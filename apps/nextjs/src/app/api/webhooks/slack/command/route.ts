import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { verifySlackRequest } from "@/lib/slack/client";
import { handleSlackCommand } from "@/lib/slack/commands/index";

export const POST = async (request: Request) => {
  const body = await request.text();
  const headers = request.headers;

  if (!(await verifySlackRequest(body, headers))) {
    return NextResponse.json({ error: "Invalid Slack signature" }, { status: 403 });
  }

  const formData = Object.fromEntries(new URLSearchParams(body));
  const { team_id, command, text, user_id, channel_id, response_url } = formData;

  if (command !== "/helper") {
    return NextResponse.json({ error: "Invalid command" }, { status: 400 });
  }

  const mailbox = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.slackTeamId, team_id || ""),
  });

  if (!mailbox?.slackBotToken) {
    return NextResponse.json({
      response_type: "ephemeral",
      text: "Helper is not properly connected to this Slack workspace. Please reconnect in Helper settings.",
    });
  }

  const immediateResponse = NextResponse.json({
    response_type: "ephemeral",
    text: "Processing your request...",
  });

  // Process command in background
  void (async () => {
    try {
      const commandParams = {
        text: text || "",
        userId: user_id || "",
        channelId: channel_id || "",
        responseUrl: response_url || "",
        mailbox: {
          id: mailbox.id,
          slug: mailbox.slug,
          slackBotToken: mailbox.slackBotToken || "",
          clerkOrganizationId: mailbox.clerkOrganizationId,
        },
      };

      await handleSlackCommand(commandParams);
    } catch (error) {
      console.error("Error handling Slack command:", error);
      if (response_url) {
        await fetch(response_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            response_type: "ephemeral",
            text: "An error occurred while processing your command. Please try again.",
          }),
        });
      }
    }
  })();

  return immediateResponse;
};

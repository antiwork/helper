import { waitUntil } from "@vercel/functions";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { env } from "@/env";
import { disconnectSlack } from "@/lib/data/mailbox";
import { verifySlackRequest } from "@/lib/slack/client";
import { processNaturalLanguageQuery, type LLMProvider } from "@/lib/slack/llm";

export const POST = async (request: Request) => {
  const body = await request.text();
  if (!(await verifySlackRequest(body, request.headers))) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
  }

  const data = JSON.parse(body);

  if (data.type === "url_verification") {
    return NextResponse.json({ challenge: data.challenge });
  }

  // Handle app_mention events (when someone @mentions the bot)
  if (data.type === "event_callback" && data.event.type === "app_mention") {
    const event = data.event;
    const text = event.text;
    const channelId = event.channel;
    const teamId = data.team_id;

    // Extract the actual query by removing the bot mention
    // Format: <@BOT_USER_ID> query text
    const botMentionPattern = /<@[A-Z0-9]+>/;
    let query = text.replace(botMentionPattern, "").trim();

    if (!query) {
      return new Response(null, { status: 200 });
    }

    // Check if a specific LLM provider is requested
    // Format: "@Helper --gemini query text" or "@Helper --openai query text"
    let provider: LLMProvider = "openai";

    if (query.startsWith("--gemini ")) {
      provider = "gemini";
      query = query.substring("--gemini ".length);
    } else if (query.startsWith("--openai ")) {
      provider = "openai";
      query = query.substring("--openai ".length);
    }

    // Find the mailbox associated with this Slack team
    const mailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.slackTeamId, teamId),
    });

    if (mailbox?.slackBotToken) {
      // Process the query in the background
      waitUntil(processNaturalLanguageQuery(query, mailbox.id, mailbox.slackBotToken, channelId, provider));
    }

    return new Response(null, { status: 200 });
  }

  if (data.type === "event_callback" && data.event.type === "tokens_revoked") {
    for (const userId of data.event.tokens.bot) {
      const mailbox = await db.query.mailboxes.findFirst({
        where: and(eq(mailboxes.slackTeamId, data.team_id), eq(mailboxes.slackBotUserId, userId)),
      });

      if (mailbox) await disconnectSlack(mailbox.id);
    }
    return new Response(null, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
};

import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages, faqs } from "@/db/schema";
import { handleKnowledgeBankSlackAction } from "@/lib/data/knowledge";
import { verifySlackRequest } from "@/lib/slack/client";
import { handleMessageSlackAction } from "@/lib/slack/shared";

export const POST = async (request: Request) => {
  const body = await request.text();
  const headers = request.headers;

  if (!(await verifySlackRequest(body, headers))) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 403 });
  }

  const payload = JSON.parse(new URLSearchParams(body).get("payload") || "{}");
  const messageTs = payload.view?.private_metadata || payload.container?.message_ts;

  if (!messageTs) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const message = await db.query.conversationMessages.findFirst({
    where: eq(conversationMessages.slackMessageTs, messageTs),
    with: {
      conversation: {
        with: {
          mailbox: true,
        },
      },
    },
  });
  if (message?.conversation) {
    await handleMessageSlackAction(
      {
        conversationId: message.conversation.id,
        slackChannel: message.slackChannel,
        slackMessageTs: message.slackMessageTs,
      },
      payload,
    );
    return new Response(null, { status: 200 });
  }

  const knowledge = await db.query.faqs.findFirst({
    where: eq(faqs.slackMessageTs, messageTs),
    with: {
      mailbox: true,
    },
  });

  if (knowledge) {
    await handleKnowledgeBankSlackAction(knowledge, knowledge.mailbox, payload);
    return new Response(null, { status: 200 });
  }

  return Response.json({ error: "Message not found" }, { status: 404 });
};

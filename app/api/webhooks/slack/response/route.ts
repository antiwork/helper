import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { agentMessages, conversationMessages, faqs } from "@/db/schema";
import { handleKnowledgeBankSlackAction } from "@/lib/data/knowledge";
import { getMailbox } from "@/lib/data/mailbox";
import { handleAgentMessageSlackAction } from "@/lib/slack/agent/handleAgentMessageSlackAction";
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

  if (payload.container?.channel_id) {
    const agentMessage = await db.query.agentMessages.findFirst({
      where: and(eq(agentMessages.slackChannel, payload.container.channel_id), eq(agentMessages.messageTs, messageTs)),
      orderBy: desc(agentMessages.createdAt),
    });
    if (agentMessage) {
      await handleAgentMessageSlackAction(agentMessage, payload);
      return new Response(null, { status: 200 });
    }
  }

  const message = await db.query.conversationMessages.findFirst({
    where: eq(conversationMessages.slackMessageTs, messageTs),
    with: {
      conversation: true,
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
  });

  if (knowledge) {
    const mailbox = await getMailbox();
    if (mailbox) {
      await handleKnowledgeBankSlackAction(knowledge, mailbox, payload);
    }
    return new Response(null, { status: 200 });
  }

  return Response.json({ error: "Message not found" }, { status: 404 });
};

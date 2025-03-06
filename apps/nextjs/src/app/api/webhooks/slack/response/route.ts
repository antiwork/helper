import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { verifySlackRequest } from "@/lib/slack/client";
import { handleSlackAction } from "@/lib/slack/shared";

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
    await handleSlackAction(
      {
        conversationId: message.conversation.id,
        slackChannel: message.slackChannel,
        slackMessageTs: message.slackMessageTs,
      },
      payload,
    );
    return new Response(null, { status: 200 });
  }

  return Response.json({ error: "Message not found" }, { status: 404 });
};

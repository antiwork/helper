import { WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { agentMessages, agentThreads } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { postThinkingMessage } from "@/lib/slack/agent/handleMessages";

export const handleAgentMessageSlackAction = async (agentMessage: typeof agentMessages.$inferSelect, payload: any) => {
  const agentThread = assertDefined(
    await db.query.agentThreads.findFirst({
      where: eq(agentThreads.id, agentMessage.agentThreadId),
    }),
  );

  const mailbox = await getMailbox();
  if (!mailbox?.slackBotToken) throw new Error("Mailbox not found or not linked to Slack");
  const client = new WebClient(mailbox.slackBotToken);

  if (payload.actions?.[0]?.action_id === "cancel") {
    await client.chat.postMessage({
      channel: payload.container.channel_id,
      thread_ts: payload.container.thread_ts,
      text: "_Cancelled. Let me know if you need anything else._",
    });
  } else {
    await triggerEvent("slack/agent.message", {
      slackUserId: payload.user.id,
      confirmedReplyText: payload.state.values.proposed_message?.proposed_message?.value,
      confirmedKnowledgeBaseEntry: payload.state.values.proposed_entry?.proposed_entry?.value,
      agentThreadId: agentMessage.agentThreadId,
      statusMessageTs: await postThinkingMessage(client, agentThread.slackChannel, agentThread.threadTs),
    });
  }
  await client.chat.delete({
    channel: payload.container.channel_id,
    ts: payload.container.message_ts,
  });
};

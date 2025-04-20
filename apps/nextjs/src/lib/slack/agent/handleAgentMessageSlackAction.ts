import { WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { agentMessages, agentThreads } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { postThinkingMessage } from "@/lib/slack/agent/handleMessages";

export const handleAgentMessageSlackAction = async (agentMessage: typeof agentMessages.$inferSelect, payload: any) => {
  const agentThread = assertDefined(
    await db.query.agentThreads.findFirst({
      where: eq(agentThreads.id, agentMessage.agentThreadId),
      with: {
        mailbox: true,
      },
    }),
  );

  const client = new WebClient(assertDefined(agentThread.mailbox.slackBotToken));

  if (payload.actions?.[0]?.action_id === "edit_reply") {
    await client.chat.postEphemeral({
      channel: payload.container.channel_id,
      thread_ts: payload.container.thread_ts,
      user: payload.user.id,
      blocks: [
        {
          type: "input",
          element: {
            type: "plain_text_input",
            multiline: true,
            action_id: "proposed_message",
            initial_value: payload.actions[0].value,
          },
          label: {
            type: "plain_text",
            text: "Please confirm the message I'll reply with:",
          },
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Confirm reply text",
                emoji: true,
              },
              value: "confirm",
              style: "primary",
              action_id: "confirm",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Cancel",
              },
              value: "cancel",
              action_id: "cancel",
            },
          ],
        },
      ],
    });
  } else if (payload.actions?.[0]?.action_id === "cancel") {
    await client.chat.postMessage({
      channel: payload.container.channel_id,
      thread_ts: payload.container.thread_ts,
      text: "_Cancelled. Let me know if you need anything else._",
    });
  } else {
    const text = payload.actions[0].value; // TODO get from input if present
    await inngest.send({
      name: "slack/agent.message",
      data: {
        event: null,
        confirmedReplyText: text,
        agentThreadId: agentMessage.agentThreadId,
        currentMailboxId: agentThread.mailboxId,
        statusMessageTs: await postThinkingMessage(client, agentThread.slackChannel, agentThread.threadTs),
      },
    });
  }
  await client.chat.delete({
    channel: payload.container.channel_id,
    ts: payload.container.message_ts,
  });
};

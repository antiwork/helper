import { WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { agentMessages, agentThreads } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { getMailbox } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { generateAgentResponse } from "@/lib/slack/agent/generateAgentResponse";
import { getThreadMessages } from "@/lib/slack/agent/getThreadMessages";

export const handleSlackAgentMessage = async ({
  slackUserId,
  statusMessageTs,
  agentThreadId,
  confirmedReplyText,
}: {
  slackUserId: string | null;
  statusMessageTs: string;
  agentThreadId: number;
  confirmedReplyText?: string;
}) => {
  const agentThread = assertDefinedOrRaiseNonRetriableError(
    await db.query.agentThreads.findFirst({
      where: eq(agentThreads.id, agentThreadId),
    }),
  );
  const mailbox = assertDefined(await getMailbox());

  const messages = await getThreadMessages(
    assertDefined(mailbox.slackBotToken),
    agentThread.slackChannel,
    agentThread.threadTs,
    assertDefined(mailbox.slackBotUserId),
  );

  const client = new WebClient(assertDefined(mailbox.slackBotToken));
  const debug = messages.some(
    (message) => typeof message?.content === "string" && /(?:^|\s)!debug(?:$|\s)/.test(message.content),
  );

  const showStatus = async (
    status: string | null,
    tool?: { toolName: string; parameters: Record<string, unknown> },
  ) => {
    if (tool && agentThread) {
      await db.insert(agentMessages).values({
        agentThreadId: agentThread.id,
        role: "tool",
        content: status ?? "",
        metadata: tool,
      });
    }

    if (debug && status) {
      await client.chat.postMessage({
        channel: agentThread.slackChannel,
        thread_ts: agentThread.threadTs,
        text: tool
          ? `_${status ?? "..."}_\n\n*Parameters:*\n\`\`\`\n${JSON.stringify(tool.parameters, null, 2)}\n\`\`\``
          : `_${status ?? "..."}_`,
      });
    } else if (status) {
      await client.chat.update({
        channel: agentThread.slackChannel,
        ts: statusMessageTs,
        text: `_${status}_`,
      });
    }
  };

  const { text, confirmReplyText } = await generateAgentResponse(
    messages,
    mailbox,
    slackUserId,
    showStatus,
    confirmedReplyText,
  );

  const assistantMessage = await db
    .insert(agentMessages)
    .values({
      agentThreadId: agentThread.id,
      role: "assistant",
      content: text,
    })
    .returning()
    .then(takeUniqueOrThrow);

  const { ts } = await client.chat.postMessage({
    channel: agentThread.slackChannel,
    thread_ts: agentThread.threadTs,
    text,
  });

  if (ts) {
    await db
      .update(agentMessages)
      .set({
        slackChannel: agentThread.slackChannel,
        messageTs: ts,
      })
      .where(eq(agentMessages.id, assistantMessage.id));
  }

  if (!debug) {
    try {
      await client.chat.delete({
        channel: agentThread.slackChannel,
        ts: statusMessageTs,
      });
    } catch (error) {
      captureExceptionAndLog(error, {
        extra: {
          message: "Error deleting status message",
          channel: agentThread.slackChannel,
          statusMessageTs,
        },
      });
    }
  }

  if (confirmReplyText) {
    const { ts } = await client.chat.postMessage({
      channel: agentThread.slackChannel,
      thread_ts: agentThread.threadTs,
      blocks: [
        {
          type: "input",
          block_id: "proposed_message",
          element: {
            type: "plain_text_input",
            multiline: true,
            action_id: "proposed_message",
            initial_value: confirmReplyText.args.proposedMessage,
          },
          label: {
            type: "plain_text",
            text: "Message:",
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

    if (ts) {
      await db.insert(agentMessages).values({
        agentThreadId: agentThread.id,
        role: "assistant",
        content: `Confirming reply text: ${confirmReplyText.args.proposedMessage}`,
        slackChannel: agentThread.slackChannel,
        messageTs: ts,
      });
    }
  }

  return { text, agentThreadId: agentThread.id };
};

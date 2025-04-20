import { AppMentionEvent, GenericMessageEvent, WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { agentMessages, agentThreads } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { assertDefinedOrRaiseNonRetriableError } from "@/inngest/utils";
import { getMailboxById } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { generateAgentResponse } from "@/lib/slack/agent/generateAgentResponse";
import { getThreadMessages } from "@/lib/slack/agent/getThreadMessages";

export const handleSlackAgentMessage = async (
  event: GenericMessageEvent | AppMentionEvent | null,
  currentMailboxId: number,
  statusMessageTs: string,
  agentThreadId: number,
  confirmedReplyText: string | null,
) => {
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(currentMailboxId));
  const agentThread = assertDefinedOrRaiseNonRetriableError(
    await db.query.agentThreads.findFirst({
      where: eq(agentThreads.id, agentThreadId),
    }),
  );

  const client = new WebClient(assertDefined(mailbox.slackBotToken));
  const debug = event?.text && /(?:^|\s)!debug(?:$|\s)/.test(event.text);

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

  const messages = await getThreadMessages(
    assertDefined(mailbox.slackBotToken),
    agentThread.slackChannel,
    agentThread.threadTs,
    assertDefined(mailbox.slackBotUserId),
  );

  const { text, confirmReplyText } = await generateAgentResponse(
    messages,
    mailbox,
    event?.user,
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
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Edit reply",
                emoji: true,
              },
              value: confirmReplyText.args.proposedMessage,
              action_id: "edit_reply",
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "Send as is",
              },
              value: "send_as_is",
              action_id: "send_as_is",
            },
          ],
        },
      ],
    });

    if (ts) {
      await db.insert(agentMessages).values({
        agentThreadId: confirmReplyText.args.ticketId, // TODO
        role: "assistant",
        content: `Confirming reply text: ${confirmReplyText.args.proposedMessage}`,
        slackChannel: agentThread.slackChannel,
        messageTs: ts,
      });
    }
  }

  return { text, agentThreadId: agentThread.id };
};

export default inngest.createFunction(
  { id: "slack-agent-message-handler" },
  { event: "slack/agent.message" },
  async ({ event, step }) => {
    const { event: slackEvent, currentMailboxId, statusMessageTs, agentThreadId, confirmedReplyText } = event.data;

    const result = await step.run("process-agent-message", async () => {
      return await handleSlackAgentMessage(
        slackEvent,
        currentMailboxId,
        statusMessageTs,
        agentThreadId,
        confirmedReplyText ?? null,
      );
    });

    return { result };
  },
);

import { AppMentionEvent, GenericMessageEvent, WebClient } from "@slack/web-api";
import { CoreMessage } from "ai";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { agentMessages, agentThreads } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { assertDefinedOrRaiseNonRetriableError } from "@/inngest/utils";
import { getMailboxById } from "@/lib/data/mailbox";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { generateAgentResponse } from "@/lib/slack/agent/generateAgentResponse";
import { getThreadMessages } from "@/lib/slack/client";

export const handleSlackAgentMessage = async (
  event: GenericMessageEvent | AppMentionEvent,
  currentMailboxId: number,
  statusMessageTs: string,
  agentThreadId: number,
) => {
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(currentMailboxId));
  const agentThread = assertDefinedOrRaiseNonRetriableError(
    await db.query.agentThreads.findFirst({
      where: eq(agentThreads.id, agentThreadId),
    }),
  );

  const { thread_ts, channel } = event;
  const client = new WebClient(assertDefined(mailbox.slackBotToken));
  const debug = event.text && /(?:^|\s)!debug(?:$|\s)/.test(event.text);

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
        channel: event.channel,
        thread_ts: event.thread_ts ?? event.ts,
        text: tool
          ? `_${status ?? "..."}_\n\n*Parameters:*\n\`\`\`\n${JSON.stringify(tool.parameters, null, 2)}\n\`\`\``
          : `_${status ?? "..."}_`,
      });
    } else if (status) {
      await client.chat.update({
        channel: event.channel,
        ts: statusMessageTs,
        text: `_${status}_`,
      });
    }
  };

  const messages = thread_ts
    ? await getThreadMessages(
        assertDefined(mailbox.slackBotToken),
        channel,
        thread_ts,
        assertDefined(mailbox.slackBotUserId),
      )
    : ([{ role: "user", content: event.text ?? "" }] satisfies CoreMessage[]);

  const result = await generateAgentResponse(messages, mailbox, event.user, showStatus);

  if (agentThread) {
    await db.insert(agentMessages).values({
      agentThreadId: agentThread.id,
      role: "assistant",
      content: result,
      slackChannel: event.channel,
      messageTs: event.thread_ts ?? event.ts,
    });
  }

  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: result,
  });

  if (!debug) {
    try {
      await client.chat.delete({
        channel: event.channel,
        ts: statusMessageTs,
      });
    } catch (error) {
      captureExceptionAndLog(error, {
        extra: {
          message: "Error deleting status message",
          channel: event.channel,
          statusMessageTs,
        },
      });
    }
  }

  return result;
};

// Define the structure for the event data
interface SlackAgentMessageEventData {
  event: GenericMessageEvent | AppMentionEvent;
  currentMailboxId: number;
  statusMessageTs: string;
  agentThreadId: number;
}

export default inngest.createFunction(
  { id: "slack-agent-message-handler" },
  { event: "slack/agent.message" },
  async ({ event, step }) => {
    const {
      event: slackEvent,
      currentMailboxId,
      statusMessageTs,
      agentThreadId,
    } = event.data as SlackAgentMessageEventData;

    const result = await step.run("process-agent-message", async () => {
      return await handleSlackAgentMessage(slackEvent, currentMailboxId, statusMessageTs, agentThreadId);
    });

    return { result };
  },
);

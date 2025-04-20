import { AppMentionEvent, GenericMessageEvent, WebClient } from "@slack/web-api";
import { CoreMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
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
) => {
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(currentMailboxId));

  if (event.bot_id || event.bot_id === mailbox.slackBotUserId || event.bot_profile) return;

  const existingThread = await db.query.agentThreads.findFirst({
    where: and(eq(agentThreads.slackChannel, event.channel), eq(agentThreads.threadTs, event.thread_ts ?? event.ts)),
  });

  const agentThread = existingThread
    ? existingThread
    : await db
        .insert(agentThreads)
        .values({
          mailboxId: mailbox.id,
          slackChannel: event.channel,
          threadTs: event.thread_ts ?? event.ts,
        })
        .returning()
        .then(takeUniqueOrThrow);

  if (event.text) {
    const [message] = await db
      .insert(agentMessages)
      .values({
        agentThreadId: agentThread.id,
        role: "user",
        content: event.text,
        slackChannel: event.channel,
        messageTs: event.ts,
      })
      .onConflictDoNothing()
      .returning();
    if (!message) return;
  }

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

export default inngest.createFunction(
  { id: "slack-agent-message-handler" },
  { event: "slack/agent.message" },
  async ({ event, step }) => {
    const { event: slackEvent, currentMailboxId, statusMessageTs } = event.data;

    const result = await step.run("process-agent-message", async () => {
      return await handleSlackAgentMessage(slackEvent, currentMailboxId, statusMessageTs);
    });

    return { result };
  },
);

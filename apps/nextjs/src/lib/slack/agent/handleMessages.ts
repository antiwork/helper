import { AppMentionEvent, AssistantThreadStartedEvent, GenericMessageEvent, WebClient } from "@slack/web-api";
import { CoreMessage } from "ai";
import { and, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { agentMessages, agentThreads } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
import { SlackMailboxInfo, WHICH_MAILBOX_MESSAGE } from "@/lib/slack/agent/findMailboxForEvent";
import { generateAgentResponse } from "@/lib/slack/agent/generateAgentResponse";
import { getThreadMessages } from "@/lib/slack/client";

export async function handleMessage(event: GenericMessageEvent | AppMentionEvent, mailboxInfo: SlackMailboxInfo) {
  if (!mailboxInfo.currentMailbox) {
    await askWhichMailbox(event, mailboxInfo.mailboxes);
    return;
  }
  const mailbox = mailboxInfo.currentMailbox;
  if (event.bot_id || event.bot_id === mailbox.slackBotUserId || event.bot_profile) return;

  const { thread_ts, channel } = event;
  const { showStatus, showResult } = await replyHandler(
    new WebClient(assertDefined(mailbox.slackBotToken)),
    event,
    mailbox,
  );

  const messages = thread_ts
    ? await getThreadMessages(
        assertDefined(mailbox.slackBotToken),
        channel,
        thread_ts,
        assertDefined(mailbox.slackBotUserId),
      )
    : ([{ role: "user", content: event.text ?? "" }] satisfies CoreMessage[]);
  const result = await generateAgentResponse(messages, mailbox, event.user, showStatus);
  showResult(result);
}

export async function handleAssistantThreadMessage(event: AssistantThreadStartedEvent, mailboxInfo: SlackMailboxInfo) {
  const client = new WebClient(assertDefined(mailboxInfo.mailboxes[0]?.slackBotToken));
  const { channel_id, thread_ts } = event.assistant_thread;

  await client.chat.postMessage({
    channel: channel_id,
    thread_ts,
    text: "Hello, I'm an AI assistant to help you work with tickets in Helper!",
  });

  await client.assistant.threads.setSuggestedPrompts({
    channel_id,
    thread_ts,
    prompts: [
      {
        title: "Count open tickets",
        message: "How many open tickets are there?",
      },
      {
        title: "Search tickets",
        message: "Give me 5 tickets about payments",
      },
      {
        title: "Check assignees",
        message: "How many tickets are assigned to users other than me?",
      },
    ],
  });
}

export const isAgentThread = async (event: GenericMessageEvent, mailboxInfo: SlackMailboxInfo) => {
  const mailbox = mailboxInfo.mailboxes[0];
  if (!mailbox?.slackBotToken || !mailbox.slackBotUserId || !event.thread_ts || event.thread_ts === event.ts) {
    return false;
  }

  if (event.text?.includes("(aside)")) return false;

  const client = new WebClient(mailbox.slackBotToken);
  const { messages } = await client.conversations.replies({
    channel: event.channel,
    ts: event.thread_ts,
    limit: 50,
  });

  for (const message of messages ?? []) {
    if (message.user === mailbox.slackBotUserId) return true;
  }

  return false;
};

const replyHandler = async (
  client: WebClient,
  event: { channel: string; thread_ts?: string; ts: string; text?: string },
  mailbox: Mailbox,
) => {
  const debug = event.text && /(?:^|\s)!debug(?:$|\s)/.test(event.text);

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
    await db.insert(agentMessages).values({
      agentThreadId: agentThread.id,
      role: "user",
      content: event.text,
    });
  }

  const statusMessage = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: "_Thinking..._",
  });

  if (!statusMessage?.ts) throw new Error("Failed to post initial message");

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

    if (debug) {
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
        ts: statusMessage.ts!,
        text: `_${status}_`,
      });
    }
  };

  const showResult = async (result: string) => {
    if (agentThread) {
      await db.insert(agentMessages).values({
        agentThreadId: agentThread.id,
        role: "assistant",
        content: result,
      });
    }

    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.thread_ts ?? event.ts,
      text: result,
    });
    if (!debug) {
      await client.chat.delete({
        channel: event.channel,
        ts: statusMessage.ts!,
      });
    }
  };

  return { showStatus, showResult };
};

const askWhichMailbox = async (event: GenericMessageEvent | AppMentionEvent, mailboxes: Mailbox[]) => {
  const client = new WebClient(assertDefined(mailboxes[0]?.slackBotToken));
  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: `${WHICH_MAILBOX_MESSAGE} (${mailboxes.map((m) => m.name).join("/")})`,
  });
};

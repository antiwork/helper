import { AppMentionEvent, AssistantThreadStartedEvent, GenericMessageEvent, WebClient } from "@slack/web-api";
import { and, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { agentMessages, agentThreads } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { Mailbox } from "@/lib/data/mailbox";
import { SlackMailboxInfo, WHICH_MAILBOX_MESSAGE } from "@/lib/slack/agent/findMailboxForEvent";

export async function handleMessage(event: GenericMessageEvent | AppMentionEvent, mailboxInfo: SlackMailboxInfo) {
  if (event.bot_id || event.bot_profile) return;

  const existingThread = await db.query.agentThreads.findFirst({
    where: and(eq(agentThreads.slackChannel, event.channel), eq(agentThreads.threadTs, event.thread_ts ?? event.ts)),
  });

  const agentThread = existingThread
    ? existingThread
    : await db
        .insert(agentThreads)
        .values({
          slackChannel: event.channel,
          threadTs: event.thread_ts ?? event.ts,
        })
        .returning()
        .then(takeUniqueOrThrow);

  let message = null;
  if (event.text) {
    const [createdMessage] = await db
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

    // message will be null if we've already handled an event for this message due to the onConflictDoNothing
    message = createdMessage;
  }

  if (!message || !event.text) {
    return;
  }

  const mailbox = mailboxInfo.mailboxes.find(({ id }) => id === agentThread.mailboxId) ?? mailboxInfo.currentMailbox;
  if (!mailbox) {
    await askWhichMailbox(event, mailboxInfo.mailboxes);
    return;
  }

  const mentionedMailbox = event.text ? findMentionedMailbox(event.text, mailboxInfo.mailboxes, mailbox) : null;

  if (!agentThread.mailboxId || mentionedMailbox) {
    const mailboxToUse = mentionedMailbox || mailbox;
    await db.update(agentThreads).set({ mailboxId: mailboxToUse.id }).where(eq(agentThreads.id, agentThread.id));

    if (mentionedMailbox && mailboxInfo.mailboxes.length > 1) {
      await postMailboxSwitchMessage(
        new WebClient(assertDefined(mailboxToUse.slackBotToken)),
        event.channel,
        event.thread_ts ?? event.ts,
        mailboxToUse.name,
      );
    }
  }

  const client = new WebClient(assertDefined(mailbox.slackBotToken));

  await triggerEvent("conversations/auto-response.create", {
    messageId: message.id,
  });
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

  if (event.text?.toLowerCase().includes("(aside)")) return false;

  const client = new WebClient(mailbox.slackBotToken);
  const { messages = [] } = await client.conversations.replies({
    channel: event.channel,
    ts: event.thread_ts,
    limit: 50,
  });

  for (const message of messages ?? []) {
    if (message.user !== mailbox.slackBotUserId && message.text?.includes(`<@${mailbox.slackBotUserId}>`)) return true;
  }

  // Also respond to threads started by the bot if no other user is explicitly mentioned
  if (messages[0]?.user === mailbox.slackBotUserId) {
    return !messages[1]?.text?.match(/<@[^>]+>/);
  }

  return false;
};

export const postThinkingMessage = async (client: WebClient, channel: string, threadTs: string) => {
  const message = await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: "_Thinking..._",
  });

  if (!message?.ts) throw new Error("Failed to post initial message");

  return message.ts;
};

const askWhichMailbox = async (event: GenericMessageEvent | AppMentionEvent, mailboxes: Mailbox[]) => {
  const client = new WebClient(assertDefined(mailboxes[0]?.slackBotToken));
  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: `${WHICH_MAILBOX_MESSAGE} (${mailboxes.map((m) => m.name).join("/")})`,
  });
};

const findMentionedMailbox = (messageText: string, mailboxes: Mailbox[], currentMailbox: Mailbox): Mailbox | null => {
  if (mailboxes.length <= 1) return null;

  const lowercaseText = messageText.toLowerCase();
  for (const mailbox of mailboxes) {
    if (mailbox.id !== currentMailbox.id && lowercaseText.includes(mailbox.name.toLowerCase())) {
      return mailbox;
    }
  }
  return null;
};

const postMailboxSwitchMessage = async (client: WebClient, channel: string, threadTs: string, mailboxName: string) => {
  await client.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text: `_Switched to the ${mailboxName} mailbox_`,
  });
};

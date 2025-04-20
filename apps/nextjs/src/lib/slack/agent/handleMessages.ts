import { AppMentionEvent, AssistantThreadStartedEvent, GenericMessageEvent, WebClient } from "@slack/web-api";
import { assertDefined } from "@/components/utils/assert";
import { inngest } from "@/inngest/client";
import { Mailbox } from "@/lib/data/mailbox";
import { SlackMailboxInfo, WHICH_MAILBOX_MESSAGE } from "@/lib/slack/agent/findMailboxForEvent";

export async function handleMessage(event: GenericMessageEvent | AppMentionEvent, mailboxInfo: SlackMailboxInfo) {
  if (!mailboxInfo.currentMailbox) {
    await askWhichMailbox(event, mailboxInfo.mailboxes);
    return;
  }

  const mailbox = mailboxInfo.currentMailbox;
  if (event.bot_id || event.bot_id === mailbox.slackBotUserId || event.bot_profile) return;

  const client = new WebClient(assertDefined(mailbox.slackBotToken));
  const statusMessage = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: "_Thinking..._",
  });

  if (!statusMessage?.ts) throw new Error("Failed to post initial message");

  await inngest.send({
    name: "slack/agent.message",
    data: {
      event,
      currentMailboxId: mailbox.id,
      statusMessageTs: statusMessage.ts,
    },
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

  if (event.text?.includes("(aside)")) return false;

  const client = new WebClient(mailbox.slackBotToken);
  const { messages } = await client.conversations.replies({
    channel: event.channel,
    ts: event.thread_ts,
    limit: 50,
  });

  for (const message of messages ?? []) {
    if (message.user !== mailbox.slackBotUserId && message.text?.includes(`<@${mailbox.slackBotUserId}>`)) return true;
  }

  return false;
};

const askWhichMailbox = async (event: GenericMessageEvent | AppMentionEvent, mailboxes: Mailbox[]) => {
  const client = new WebClient(assertDefined(mailboxes[0]?.slackBotToken));
  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: `${WHICH_MAILBOX_MESSAGE} (${mailboxes.map((m) => m.name).join("/")})`,
  });
};

import { WebClient, type AssistantThreadStartedEvent, type GenericMessageEvent } from "@slack/web-api";
import { assertDefined } from "@/components/utils/assert";
import { Mailbox } from "@/lib/data/mailbox";
import { generateResponse } from "@/lib/slack/agent/generateResponse";
import { updateStatusUtil } from "@/lib/slack/agent/handleAppMention";
import { getThreadMessages } from "@/lib/slack/client";

export async function assistantThreadMessage(event: AssistantThreadStartedEvent, mailbox: Mailbox) {
  const client = new WebClient(assertDefined(mailbox.slackBotToken));
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

export async function handleNewAssistantMessage(event: GenericMessageEvent, mailbox: Mailbox) {
  if (event.bot_id || event.bot_id === mailbox.slackBotUserId || event.bot_profile || !event.thread_ts) return;

  const { thread_ts, channel } = event;
  const { showStatus, showResult } = await updateStatusUtil(new WebClient(assertDefined(mailbox.slackBotToken)), event);

  const messages = await getThreadMessages(
    assertDefined(mailbox.slackBotToken),
    channel,
    thread_ts,
    assertDefined(mailbox.slackBotUserId),
  );
  const result = await generateResponse(messages, mailbox, event.user, showStatus);
  showResult(result);
}

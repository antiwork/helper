import { WebClient, type AssistantThreadStartedEvent, type GenericMessageEvent } from "@slack/web-api";
import { assertDefined } from "@/components/utils/assert";
import { Mailbox } from "@/lib/data/mailbox";
import { generateResponse } from "@/lib/slack/agent/generateResponse";
import { updateStatusUtil } from "@/lib/slack/agent/handleAppMention";
import { getThreadMessages } from "@/lib/slack/client";

export async function assistantThreadMessage(event: AssistantThreadStartedEvent, mailbox: Mailbox) {
  const client = new WebClient(assertDefined(mailbox.slackBotToken));
  const { channel_id, thread_ts } = event.assistant_thread;
  console.log(`Thread started: ${channel_id} ${thread_ts}`);
  console.log(JSON.stringify(event));

  await client.chat.postMessage({
    channel: channel_id,
    thread_ts,
    text: "Hello, I'm an AI assistant built with the AI SDK by Vercel!",
  });

  await client.assistant.threads.setSuggestedPrompts({
    channel_id,
    thread_ts,
    prompts: [
      {
        title: "Get the weather",
        message: "What is the current weather in London?",
      },
      {
        title: "Get the news",
        message: "What is the latest Premier League news from the BBC?",
      },
    ],
  });
}

export async function handleNewAssistantMessage(event: GenericMessageEvent, mailbox: Mailbox) {
  if (event.bot_id || event.bot_id === mailbox.slackBotUserId || event.bot_profile || !event.thread_ts) return;

  const { thread_ts, channel } = event;
  const updateStatus = await updateStatusUtil(
    new WebClient(assertDefined(mailbox.slackBotToken)),
    "is thinking...",
    event,
  );

  const messages = await getThreadMessages(
    assertDefined(mailbox.slackBotToken),
    channel,
    thread_ts,
    assertDefined(mailbox.slackBotUserId),
  );
  const result = await generateResponse(messages, updateStatus);

  updateStatus(result);
}

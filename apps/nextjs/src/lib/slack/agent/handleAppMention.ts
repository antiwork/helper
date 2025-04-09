import { AppMentionEvent, WebClient } from "@slack/web-api";
import { assertDefined } from "@/components/utils/assert";
import { Mailbox } from "@/lib/data/mailbox";
import { generateResponse } from "@/lib/slack/agent/generateResponse";
import { getThreadMessages } from "@/lib/slack/client";

export const updateStatusUtil = async (
  client: WebClient,
  initialStatus: string,
  event: { channel: string; thread_ts?: string; ts: string },
) => {
  const initialMessage = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: initialStatus,
  });

  if (!initialMessage?.ts) throw new Error("Failed to post initial message");

  const updateMessage = async (status: string) => {
    await client.chat.update({
      channel: event.channel,
      ts: initialMessage.ts!,
      text: status,
    });
  };
  return updateMessage;
};

export async function handleNewAppMention(event: AppMentionEvent, mailbox: Mailbox) {
  if (event.bot_id || event.bot_profile) return;

  const client = new WebClient(assertDefined(mailbox.slackBotToken));
  const { thread_ts, channel } = event;
  const updateMessage = await updateStatusUtil(client, "is thinking...", event);

  if (thread_ts) {
    const messages = await getThreadMessages(
      assertDefined(mailbox.slackBotToken),
      channel,
      thread_ts,
      assertDefined(mailbox.slackBotUserId),
    );
    const result = await generateResponse(messages, updateMessage);
    updateMessage(result);
  } else {
    const result = await generateResponse([{ role: "user", content: event.text }], updateMessage);
    updateMessage(result);
  }
}

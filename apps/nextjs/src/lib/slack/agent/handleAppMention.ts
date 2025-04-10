import { AppMentionEvent, WebClient } from "@slack/web-api";
import { assertDefined } from "@/components/utils/assert";
import { Mailbox } from "@/lib/data/mailbox";
import { generateResponse } from "@/lib/slack/agent/generateResponse";
import { getThreadMessages } from "@/lib/slack/client";

export const updateStatusUtil = async (
  client: WebClient,
  initialStatus: string,
  event: { channel: string; thread_ts?: string; ts: string },
  debug = false,
) => {
  const initialMessage = await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.thread_ts ?? event.ts,
    text: initialStatus,
  });

  if (!initialMessage?.ts) throw new Error("Failed to post initial message");

  const updateMessage = async (status: string, debugContent?: string) => {
    if (debug) {
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.thread_ts ?? event.ts,
        text: debugContent ? `${status}\n\n*Debug:*\n\`\`\`\n${debugContent}\n\`\`\`` : status,
      });
    } else {
      await client.chat.update({
        channel: event.channel,
        ts: initialMessage.ts!,
        text: status,
      });
    }
  };
  return updateMessage;
};

export async function handleNewAppMention(event: AppMentionEvent, mailbox: Mailbox) {
  if (event.bot_id || event.bot_profile) return;

  try {
    const client = new WebClient(assertDefined(mailbox.slackBotToken));
    const { thread_ts, channel } = event;
    const updateMessage = await updateStatusUtil(
      client,
      "is thinking...",
      event,
      /(?:^|\s)!debug(?:$|\s)/.test(event.text ?? ""),
    );

    if (thread_ts) {
      const messages = await getThreadMessages(
        assertDefined(mailbox.slackBotToken),
        channel,
        thread_ts,
        assertDefined(mailbox.slackBotUserId),
      );
      const result = await generateResponse(messages, mailbox, updateMessage);
      updateMessage(result);
    } else {
      const result = await generateResponse([{ role: "user", content: event.text }], mailbox, updateMessage);
      updateMessage(result);
    }
  } catch (e: unknown) {
    // Fix linter error by properly typing the catch variable
    console.error(e instanceof Error && "data" in e ? (e as any).data : null);
    console.error(e);
  }
}

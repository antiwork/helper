import { SlackEvent, WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
import { redis } from "@/lib/redis/client";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { getThreadMessages } from "@/lib/slack/client";

export const WHICH_MAILBOX_MESSAGE = "Which mailbox is this about?";

const cachedChannelInfo = async (token: string, teamId: string, channelId: string) => {
  const cachedValue = await redis.get<string>(`slack:channel:${teamId}:${channelId}`);
  if (cachedValue) return cachedValue;

  const client = new WebClient(token);
  const response = await client.conversations.info({ channel: channelId });
  const info = `${response.channel?.name}\n${response.channel?.purpose}\n${response.channel?.topic}`;
  await redis.set(`slack:channel:${teamId}:${channelId}`, info, { ex: 60 * 60 * 24 });
  return info;
};

export type SlackMailboxInfo = {
  mailboxes: Mailbox[];
  currentMailbox: Mailbox | null;
};

// Multiple mailboxes can be connected to the same Slack team, so we need to find the right one.
// Some actions may be possible without selecting a mailbox, so we also return all matching mailboxes.
export const findMailboxForEvent = async (event: SlackEvent): Promise<SlackMailboxInfo> => {
  let conditions;
  if ("team_id" in event) {
    conditions = eq(mailboxes.slackTeamId, String(event.team_id));
  } else if ("team" in event) {
    conditions = eq(mailboxes.slackTeamId, String(event.team));
  } else if ("assistant_thread" in event) {
    conditions = eq(mailboxes.slackTeamId, String(event.assistant_thread.context.team_id));
  }

  if (!conditions) {
    captureExceptionAndLog(new Error("Slack event does not have team_id or team"), {
      extra: { event },
    });
    return { mailboxes: [], currentMailbox: null };
  }

  const matchingMailboxes = await db.query.mailboxes.findMany({
    where: conditions,
  });
  if (!matchingMailboxes[0]) {
    captureExceptionAndLog(new Error("No mailbox found for Slack event"), {
      extra: { event },
    });
    return { mailboxes: [], currentMailbox: null };
  }
  if (matchingMailboxes.length === 1) return { mailboxes: matchingMailboxes, currentMailbox: matchingMailboxes[0] };

  const channelInfo =
    "channel" in event && typeof event.channel === "string"
      ? await cachedChannelInfo(
          assertDefined(matchingMailboxes[0].slackBotToken),
          assertDefined(matchingMailboxes[0].slackTeamId),
          event.channel,
        )
      : null;

  let messageTextToCheck = "text" in event ? (event.text ?? "") : "";
  // If the user is replying to a thread with the assistant, either find the place they replied to the "which mailbox?" question or check all messages
  if ("thread_ts" in event && event.thread_ts && "ts" in event && event.ts !== event.thread_ts) {
    const threadMessages = await getThreadMessages(
      assertDefined(matchingMailboxes[0].slackBotToken),
      event.channel,
      event.thread_ts,
      assertDefined(matchingMailboxes[0].slackBotUserId),
    );
    const askedIndex = threadMessages.findLastIndex(
      (message) => message.role === "assistant" && message.content.toString().startsWith(WHICH_MAILBOX_MESSAGE),
    );
    if (askedIndex !== -1) {
      messageTextToCheck = threadMessages[askedIndex + 1]?.content.toString() ?? "";
    } else {
      messageTextToCheck = threadMessages
        .filter((message) => message.role === "user")
        .map((message) => message.content.toString())
        .join("\n");
    }
  }

  for (const mailbox of matchingMailboxes) {
    if (messageTextToCheck.toLowerCase().includes(mailbox.name.toLowerCase()))
      return { mailboxes: matchingMailboxes, currentMailbox: mailbox };
    if (channelInfo?.toLowerCase().includes(mailbox.name.toLowerCase()))
      return { mailboxes: matchingMailboxes, currentMailbox: mailbox };
  }
  return { mailboxes: matchingMailboxes, currentMailbox: null };
};

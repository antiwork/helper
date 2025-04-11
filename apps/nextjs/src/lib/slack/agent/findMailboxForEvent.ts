import { SlackEvent, WebClient } from "@slack/web-api";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
import { redis } from "@/lib/redis/client";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

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

export const findMailboxForEvent = async (event: SlackEvent): Promise<SlackMailboxInfo> => {
  let conditions;
  if ("team_id" in event) {
    conditions = eq(mailboxes.slackTeamId, String(event.team_id));
  } else if ("team" in event) {
    conditions = eq(mailboxes.slackTeamId, String(event.team));
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

  for (const mailbox of matchingMailboxes) {
    if ("text" in event && event.text?.includes(mailbox.name))
      return { mailboxes: matchingMailboxes, currentMailbox: mailbox };
    if (channelInfo?.includes(mailbox.name)) return { mailboxes: matchingMailboxes, currentMailbox: mailbox };
  }
  return { mailboxes: matchingMailboxes, currentMailbox: null };
};

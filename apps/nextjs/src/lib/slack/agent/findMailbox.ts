import { SlackEvent, WebClient } from "@slack/web-api";
import { and, eq, inArray } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
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

export const findMailboxForEvent = async (event: SlackEvent) => {
  console.log("event", event);

  let conditions;
  if ("tokens" in event && "team_id" in event) {
    conditions = and(
      eq(mailboxes.slackTeamId, String(event.team_id)),
      inArray(mailboxes.slackBotUserId, event.tokens.bot ?? []),
    );
  } else if ("team" in event && "text" in event) {
    const userIds = [...(event.text ?? "").matchAll(/<@(U[A-Z0-9]+)>/g)].flatMap(([_, id]) => (id ? [id] : [])) ?? [];
    if ("parent_user_id" in event && event.parent_user_id) {
      userIds.push(event.parent_user_id);
    }
    conditions = and(eq(mailboxes.slackTeamId, String(event.team)), inArray(mailboxes.slackBotUserId, userIds));
  }

  if (!conditions) {
    captureExceptionAndLog(new Error("Slack event does not have tokens or team_id"), {
      extra: { event },
    });
    return null;
  }

  const matchingMailboxes = await db.query.mailboxes.findMany({
    where: conditions,
  });
  if (!matchingMailboxes[0]) {
    captureExceptionAndLog(new Error("No mailbox found for Slack event"), {
      extra: { event },
    });
    return null;
  }
  if (matchingMailboxes.length === 1) return matchingMailboxes[0];

  const channelInfo =
    "channel" in event && typeof event.channel === "string"
      ? await cachedChannelInfo(
          assertDefined(matchingMailboxes[0].slackBotToken),
          assertDefined(matchingMailboxes[0].slackTeamId),
          event.channel,
        )
      : null;

  for (const mailbox of matchingMailboxes) {
    if ("text" in event && event.text?.includes(mailbox.name)) return mailbox;
    if (channelInfo?.includes(mailbox.name)) return mailbox;
  }
  return matchingMailboxes[0];
};

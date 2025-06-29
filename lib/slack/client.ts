import crypto from "crypto";
import {
  ChatPostEphemeralArguments,
  ChatPostMessageArguments,
  ConversationsListResponse,
  KnownBlock,
  MessageAttachment,
  ModalView,
  WebClient,
} from "@slack/web-api";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { SLACK_REDIRECT_URI } from "./constants";

export const getSlackPermalink = async (token: string, channel: string, ts: string) => {
  try {
    const client = new WebClient(token);
    const response = await client.chat.getPermalink({ channel, message_ts: ts });
    return response.permalink ?? null;
  } catch (error) {
    captureExceptionAndLog(error);
    return null;
  }
};

export const getSlackUser = async (token: string, user_id: string) => {
  const client = new WebClient(token);
  const response = await client.users.info({ user: user_id });
  return response.user ?? null;
};

export const verifySlackRequest = (body: string, headers: Headers) => {
  const slackSignature = headers.get("x-slack-signature");
  const timestamp = headers.get("x-slack-request-timestamp");
  const slackSigningSecret = env.SLACK_SIGNING_SECRET;

  if (
    !slackSignature ||
    !slackSigningSecret ||
    !timestamp ||
    new Date(Number(timestamp) * 1000).getTime() < Date.now() - 300 * 1000
  ) {
    return Promise.resolve(false);
  }

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto.createHmac("sha256", slackSigningSecret);
  const computedSignature = `v0=${hmac.update(baseString).digest("hex")}`;

  return Promise.resolve(crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(slackSignature)));
};

export const postSlackMessage = async (
  token: string,
  {
    ephemeralUserId,
    ...options
  }: ChatPostMessageArguments & {
    ephemeralUserId?: string;
  },
) => {
  const client = new WebClient(token);
  const postMessage = async () => {
    if (ephemeralUserId) {
      const response = await client.chat.postEphemeral({
        ...options,
        user: ephemeralUserId,
      } as ChatPostEphemeralArguments);
      if (!response.message_ts) {
        throw new Error(`Failed to post Slack message: ${response.error}`);
      }
      return response.message_ts;
    }
    const response = await client.chat.postMessage(options);
    if (!response.message?.ts) {
      throw new Error(`Failed to post Slack message: ${response.error}`);
    }
    return response.message.ts;
  };

  const addBotToSlackChannel = async () => {
    await client.conversations.join({ channel: options.channel });
  };

  try {
    return await postMessage();
  } catch (error) {
    if (error instanceof Error && error.message.includes("not_in_channel")) {
      await addBotToSlackChannel();
      return await postMessage();
    }
    throw error;
  }
};

export const updateSlackMessage = async ({
  token,
  channel,
  ts,
  attachments,
  blocks,
}: {
  token: string;
  channel: string;
  ts: string;
  attachments?: MessageAttachment[];
  blocks?: KnownBlock[];
}) => {
  const client = new WebClient(token);
  try {
    await client.chat.update({ channel, ts, attachments: attachments ?? [], blocks: blocks ?? [] });
  } catch (error) {
    if (isIgnorableSlackError(error)) return;
    throw error;
  }
};

export const isIgnorableSlackError = (error: unknown) => {
  return (
    error instanceof Error &&
    (error.message.includes("invalid_auth") ||
      error.message.includes("not_in_channel") ||
      error.message.includes("message_not_found"))
  );
};

export const openSlackModal = async ({
  token,
  triggerId,
  title,
  view,
}: {
  token: string;
  triggerId: string;
  title: string;
  view: Partial<ModalView>;
}) => {
  const client = new WebClient(token);
  const response = await client.views.open({
    trigger_id: triggerId,
    view: {
      type: "modal",
      title: {
        type: "plain_text",
        text: title,
      },
      submit: {
        type: "plain_text",
        text: "Submit",
      },
      blocks: [],
      ...view,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to open Slack modal: ${response.error}`);
  }

  return response.view;
};

export const uninstallSlackApp = async (token: string) => {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET)
    throw new Error("SLACK_CLIENT_ID or SLACK_CLIENT_SECRET is not set");

  const client = new WebClient(token);
  const response = await client.apps.uninstall({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
  });

  if (!response.ok) {
    throw new Error(`Failed to uninstall Slack app: ${response.error}`);
  }
};

export const listSlackChannels = async (token: string) => {
  const client = new WebClient(token);
  let channels: ConversationsListResponse["channels"] = [];
  let cursor: string | undefined;

  do {
    const response = await client.conversations.list({
      limit: 1000,
      cursor,
      exclude_archived: true,
    });

    channels = channels.concat(response.channels ?? []);
    cursor = response.response_metadata?.next_cursor;
  } while (cursor);

  return channels;
};

export const getSlackAccessToken = async (code: string) => {
  if (!env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET)
    throw new Error("SLACK_CLIENT_ID or SLACK_CLIENT_SECRET is not set");

  const client = new WebClient();
  const response = await client.oauth.v2.access({
    client_id: env.SLACK_CLIENT_ID,
    client_secret: env.SLACK_CLIENT_SECRET,
    code,
    redirect_uri: SLACK_REDIRECT_URI,
  });

  if (!response.ok) {
    throw new Error(response.error || "Failed to get Slack access token");
  }

  return {
    teamId: response.team?.id,
    botUserId: response.bot_user_id,
    accessToken: response.access_token,
  };
};

const listSlackUsers = async (token: string) => {
  const response = await fetch("https://slack.com/api/users.list", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = (await response.json()) as {
    ok: boolean;
    members: { id: string; profile: { email: string } }[];
  };
  if (!data.ok) throw new Error("Failed to fetch Slack users");

  return data.members;
};

export const getSlackUsersByEmail = async (token: string) => {
  const slackUsers = await listSlackUsers(token).catch((error) => {
    captureExceptionAndLog(error);
    return [];
  });
  return new Map<string, string>(slackUsers.map((user) => [user.profile.email, user.id]));
};

export const handleSlackErrors = async <T>(operation: Promise<T>) => {
  try {
    return await operation;
  } catch (error) {
    if (error instanceof Error && "data" in error) {
      captureExceptionAndLog(error, {
        extra: {
          slackResponse: error.data,
        },
      });
    }
    captureExceptionAndLog(error);
  }
};

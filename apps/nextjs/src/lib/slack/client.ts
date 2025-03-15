import crypto from "crypto";
import {
  ChatPostEphemeralArguments,
  ChatPostMessageArguments,
  ConversationsListResponse,
  MessageAttachment,
  ModalView,
  WebClient,
} from "@slack/web-api";
import { ChannelAndAttachments } from "@slack/web-api/dist/types/request/chat";
import { env } from "@/env";
import { clerkClient } from "@/lib/data/user";
import { SLACK_REDIRECT_URI } from "./constants";

export const getSlackPermalink = async (token: string, channel: string, ts: string) => {
  try {
    const client = new WebClient(token);
    const response = await client.chat.getPermalink({ channel, message_ts: ts });
    return response.permalink ?? null;
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getSlackUser = async (token: string, slackUserId: string) => {
  try {
    console.log(`getSlackUser: Fetching info for Slack user ID ${slackUserId}`);
    const client = new WebClient(token);
    const response = await client.users.info({ user: slackUserId });
    console.log(
      "getSlackUser: Response received:",
      response.ok
        ? { ok: true, hasUser: !!response.user, hasEmail: !!response.user?.profile?.email }
        : { ok: false, error: response.error },
    );
    return response.user;
  } catch (error) {
    console.error("Error getting Slack user:", error);
    return null;
  }
};

export const getSlackTeam = async (token: string) => {
  const client = new WebClient(token);
  const response = await client.team.info();
  return response.team ?? null;
};

export const verifySlackRequest = (body: string, headers: Headers) => {
  const slackSignature = headers.get("x-slack-signature");
  const timestamp = headers.get("x-slack-request-timestamp");
  const slackSigningSecret = env.SLACK_SIGNING_SECRET;

  if (!slackSignature || !timestamp || new Date(Number(timestamp) * 1000).getTime() < Date.now() - 300 * 1000) {
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
  console.log("postSlackMessage called with:", {
    tokenLength: token?.length || 0,
    ephemeralUserId,
    channel: options.channel,
    hasText: !!options.text,
  });

  const client = new WebClient(token);
  const postMessage = async () => {
    if (ephemeralUserId) {
      console.log("Sending ephemeral message to user:", ephemeralUserId);
      const response = await client.chat.postEphemeral({
        ...options,
        user: ephemeralUserId,
      } as ChatPostEphemeralArguments);
      console.log("Ephemeral message response:", {
        ok: response.ok,
        error: response.error,
        hasMessageTs: !!response.message_ts,
      });
      if (!response.message_ts) {
        throw new Error(`Failed to post Slack message: ${response.error}`);
      }
      return response.message_ts;
    }

    console.log("Sending regular message to channel:", options.channel);
    const response = await client.chat.postMessage(options);
    console.log("Regular message response:", {
      ok: response.ok,
      error: response.error,
      hasMessageTs: !!response.message?.ts,
    });
    if (!response.message?.ts) {
      throw new Error(`Failed to post Slack message: ${response.error}`);
    }
    return response.message.ts;
  };

  const addBotToSlackChannel = async () => {
    console.log("Attempting to add bot to channel:", options.channel);
    try {
      await client.conversations.join({ channel: options.channel });
      console.log("Successfully added bot to channel");
    } catch (error) {
      console.error("Error adding bot to channel:", error);
      throw error;
    }
  };

  try {
    return await postMessage();
  } catch (error) {
    console.error("Error posting Slack message:", error);
    if (error instanceof Error && error.message.includes("not_in_channel")) {
      console.log("Bot not in channel, attempting to join");
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
}: {
  token: string;
  channel: string;
  ts: string;
  attachments: MessageAttachment[];
}) => {
  const client = new WebClient(token);
  try {
    await client.chat.update({ channel, ts, attachments });
  } catch (error) {
    // Can happen if the bot was removed from the Slack channel after the message was sent
    if (error instanceof Error && error.message.includes("invalid_auth")) return;
    throw error;
  }
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

export const postSlackDM = async (
  token: string,
  userId: string,
  options: Omit<ChatPostMessageArguments, "channel"> & Pick<ChannelAndAttachments, "attachments">,
) => {
  const client = new WebClient(token);

  const conversationResponse = await client.conversations.open({ users: userId });
  if (!conversationResponse.ok || !conversationResponse.channel?.id) {
    throw new Error(`Failed to open DM channel: ${conversationResponse.error}`);
  }

  return await postSlackMessage(token, {
    ...options,
    channel: conversationResponse.channel.id,
  } as ChatPostMessageArguments);
};

export const listSlackUsers = async (token: string) => {
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
    console.error("Failed to list Slack users", error);
    return [];
  });
  return new Map<string, string>(slackUsers.map((user) => [user.profile.email, user.id]));
};

export const findUserViaSlack = async (
  organizationId: string,
  token: string,
  slackUserId: string,
): Promise<{ id: string; fullName: string } | null> => {
  try {
    const client = new WebClient(token);
    const userInfo = await client.users.info({ user: slackUserId });

    if (!userInfo.ok || !userInfo.user?.profile?.email) {
      return null;
    }

    const email = userInfo.user.profile.email;

    // Find the user in Clerk by email
    const { data } = await clerkClient.users.getUserList({
      emailAddress: [email],
      organizationId: [organizationId],
    });

    const user = data[0];
    if (!user) return null;

    return {
      id: user.id,
      fullName: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
    };
  } catch (error) {
    console.error("Error finding user via Slack:", error);
    return null;
  }
};

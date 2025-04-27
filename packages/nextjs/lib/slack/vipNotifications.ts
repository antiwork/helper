import { User } from "@clerk/nextjs/server";
import { WebClient } from "@slack/web-api";
import { and, desc, eq, isNull, not } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { conversationMessages, conversations, platformCustomers } from "@/db/schema";
import { ensureCleanedUpText } from "@/lib/data/conversationMessage";
import { getPlatformCustomer } from "@/lib/data/platformCustomer";
import { getClerkUser } from "@/lib/data/user";
import { postSlackMessage } from "@/lib/slack/client";
import {
  getActionButtons,
  handleMessageSlackAction,
  OPEN_ATTACHMENT_COLOR,
  RESOLVED_ATTACHMENT_COLOR,
} from "@/lib/slack/shared";

export const updateVipMessageOnClose = async (conversationId: number, byUserId: string | null) => {
  const vipMessages = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, conversationId),
      eq(conversationMessages.role, "user"),
      not(isNull(conversationMessages.slackMessageTs)),
    ),
    orderBy: [desc(conversationMessages.createdAt)],
    with: { conversation: { with: { mailbox: true } } },
  });

  if (vipMessages.length === 0) return;

  const responses = await db.query.conversationMessages.findMany({
    where: and(eq(conversationMessages.conversationId, conversationId), not(isNull(conversationMessages.responseToId))),
    orderBy: [desc(conversationMessages.createdAt)],
  });

  for (const vipMessage of vipMessages) {
    if (vipMessage.slackMessageTs && vipMessage.conversation.mailbox.slackBotToken) {
      const response = responses.find((r) => r.responseToId === vipMessage.id);
      const cleanedUpText = response ? await ensureCleanedUpText(response) : "";
      await updateVipMessageInSlack({
        conversation: vipMessage.conversation,
        originalMessage: vipMessage.cleanedUpText ?? "",
        replyMessage: cleanedUpText,
        slackBotToken: vipMessage.conversation.mailbox.slackBotToken,
        slackChannel: vipMessage.conversation.mailbox.vipChannelId!,
        slackMessageTs: vipMessage.slackMessageTs,
        user: byUserId ? await getClerkUser(byUserId) : null,
        closed: true,
      });
    }
  }
};

const createMessageBlocks = ({
  conversation,
  messages,
  customerLinks = [],
  closed = false,
  text,
}: {
  conversation: typeof conversations.$inferSelect & {
    mailbox: {
      slug: string;
    };
  };
  messages: { type: "original" | "reply"; body: string }[];
  customerLinks: string[];
  closed?: boolean;
  text?: string;
}) => {
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":star: *VIP Customer*",
      },
    },
    ...messages.map((message) => ({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${message.type === "original" ? "Original message" : "Reply"}:*\n${message.body}`,
      },
    })),
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: [
          `<${getBaseUrl()}/mailboxes/${conversation.mailbox.slug}/conversations?id=${conversation.slug}|View in Helper>`,
          ...customerLinks,
        ].join(" · "),
      },
    },
    getActionButtons(),
  ];

  if (text) {
    blocks.push({
      type: "context",
      elements: [{ type: "mrkdwn", text }],
    });
  }

  return [
    {
      color: closed ? RESOLVED_ATTACHMENT_COLOR : OPEN_ATTACHMENT_COLOR,
      blocks,
    },
  ];
};

export const handleVipMessageAction = async (conversation: typeof conversations.$inferSelect, payload: any) => {
  await handleMessageSlackAction(
    {
      conversationId: conversation.id,
      slackChannel: payload.channel.id,
      slackMessageTs: payload.message.ts,
    },
    payload,
  );
};

export const postVipMessageToSlack = async ({
  conversation,
  message,
  platformCustomer,
  slackBotToken,
  slackChannel,
}: {
  conversation: typeof conversations.$inferSelect & {
    mailbox: {
      slug: string;
    };
  };
  message: string;
  platformCustomer: typeof platformCustomers.$inferSelect & { isVip: boolean };
  slackBotToken: string;
  slackChannel: string;
}) => {
  const customerName = platformCustomer.name ?? conversation.emailFrom ?? "Unknown";
  const heading = `_New message from VIP customer *${customerName}*_`;
  const customerLinks = platformCustomer.links
    ? Object.entries(platformCustomer.links).map(([key, value]) => `<${value}|${key}>`)
    : [];

  const attachments = createMessageBlocks({
    conversation,
    messages: [{ type: "original", body: message }],
    customerLinks,
    closed: false,
  });

  return await postSlackMessage(slackBotToken, {
    text: heading,
    mrkdwn: true,
    channel: slackChannel,
    attachments,
  });
};

export const updateVipMessageInSlack = async ({
  conversation,
  originalMessage,
  replyMessage,
  slackBotToken,
  slackChannel,
  slackMessageTs,
  user: resolvingUser,
  email,
  closed,
}: {
  conversation: typeof conversations.$inferSelect & {
    mailbox: {
      slug: string;
    };
  };
  originalMessage: string;
  replyMessage: string;
  slackBotToken: string;
  slackChannel: string;
  slackMessageTs: string;
  user: User | null;
  email?: boolean;
  closed?: boolean;
}) => {
  const byUser = resolvingUser ? ` by ${resolvingUser.fullName}` : "";

  let text = "";
  if (email && closed) {
    text = `Closed with reply${byUser}`;
  } else if (email) {
    text = `Reply sent${byUser}`;
  } else if (closed) {
    text = `Closed${byUser}`;
  }

  const emailFrom = conversation.emailFrom ?? "Unknown";
  const platformCustomer = await getPlatformCustomer(conversation.mailboxId, emailFrom);
  const customerLinks = platformCustomer?.links
    ? Object.entries(platformCustomer.links).map(([key, value]) => `<${value}|${key}>`)
    : [];
  const customerName = platformCustomer?.name ?? emailFrom;

  const heading = `_New message from VIP customer *${customerName}*_`;
  const attachments = createMessageBlocks({
    conversation,
    messages: [
      { type: "original", body: originalMessage },
      { type: "reply", body: replyMessage },
    ],
    customerLinks,
    closed,
    text,
  });

  const client = new WebClient(slackBotToken);
  try {
    await client.chat.update({
      channel: slackChannel,
      ts: slackMessageTs,
      text: heading,
      attachments,
    });
  } catch (error) {
    // Can happen if the bot was removed from the Slack channel after the message was sent
    if (error instanceof Error && error.message.includes("invalid_auth")) return;
    throw error;
  }
};

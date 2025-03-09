import "server-only";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { cache } from "react";
import { assertDefined } from "@/components/utils/assert";
import { db, Transaction } from "@/db/client";
import {
  conversationEvents,
  conversationMessages,
  conversations,
  mailboxes,
  mailboxesMetadataApi,
  subscriptions,
} from "@/db/schema";
import { env } from "@/env";
import { determineVipStatus } from "@/lib/data/platformCustomer";
import { uninstallSlackApp } from "@/lib/slack/client";
import { REQUIRED_SCOPES, SLACK_REDIRECT_URI } from "@/lib/slack/constants";
import { captureExceptionAndLogIfDevelopment } from "../shared/sentry";
import { getClerkOrganization } from "./organization";

export const getMailboxById = cache(async (id: number): Promise<Mailbox | null> => {
  const result = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.id, id),
  });
  return result ?? null;
});

export const getMailboxBySlug = cache(async (slug: string): Promise<typeof mailboxes.$inferSelect | null> => {
  const result = await db.query.mailboxes.findFirst({
    where: eq(mailboxes.slug, slug),
  });
  return result ?? null;
});

export const resetMailboxPromptUpdatedAt = async (tx: Transaction, mailboxId: number) => {
  await tx.update(mailboxes).set({ promptUpdatedAt: new Date() }).where(eq(mailboxes.id, mailboxId));
};

export type Mailbox = typeof mailboxes.$inferSelect;

const getSlackConnectUrl = (mailboxSlug: string): string => {
  const params = new URLSearchParams({
    scope: REQUIRED_SCOPES.join(","),
    redirect_uri: SLACK_REDIRECT_URI,
    client_id: env.SLACK_CLIENT_ID,
    state: JSON.stringify({ mailbox_slug: mailboxSlug }),
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
};

export const getMailboxInfo = async (mailbox: typeof mailboxes.$inferSelect) => {
  const organization = await getClerkOrganization(mailbox.clerkOrganizationId);
  const subscription = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.clerkOrganizationId, organization.id)),
    columns: {
      canceledAt: true,
      status: true,
      stripeSubscriptionId: true,
    },
  });
  const metadataEndpoint = await db.query.mailboxesMetadataApi.findFirst({
    where: and(
      eq(mailboxesMetadataApi.mailboxId, mailbox.id),
      isNull(mailboxesMetadataApi.deletedAt),
      eq(mailboxesMetadataApi.isEnabled, true),
    ),
    columns: {
      isEnabled: true,
      deletedAt: true,
      url: true,
      hmacSecret: true,
    },
  });

  return {
    id: mailbox.id,
    name: mailbox.name,
    slug: mailbox.slug,
    isStyleLinterEnabled: !!organization.privateMetadata.isStyleLinterEnabled,
    hasMetadataEndpoint: !!metadataEndpoint,
    metadataEndpoint: metadataEndpoint ?? null,
    slackConnected: !!mailbox.slackBotToken,
    slackConnectUrl: getSlackConnectUrl(mailbox.slug),
    slackAlertChannel: mailbox.slackAlertChannel,
    responseGeneratorPrompt: mailbox.responseGeneratorPrompt ?? [],
    clerkOrganizationId: mailbox.clerkOrganizationId,
    subscription: subscription ?? null,
    widgetHMACSecret: mailbox.widgetHMACSecret,
    widgetDisplayMode: mailbox.widgetDisplayMode,
    widgetDisplayMinValue: mailbox.widgetDisplayMinValue,
    widgetHost: mailbox.widgetHost,
    autoRespondEmailToChat: mailbox.autoRespondEmailToChat,
    vipThreshold: mailbox.vipThreshold,
    vipChannelId: mailbox.vipChannelId,
    vipExpectedResponseHours: mailbox.vipExpectedResponseHours,
    disableAutoResponseForVips: mailbox.disableAutoResponseForVips,
  };
};

export const disconnectSlack = async (mailboxId: number): Promise<void> => {
  const mailbox = assertDefined(
    await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, mailboxId),
      columns: {
        slackBotToken: true,
      },
    }),
  );

  if (!mailbox?.slackBotToken) return;

  try {
    await uninstallSlackApp(mailbox.slackBotToken);
  } catch (error) {
    // Likely indicates that the app was already uninstalled from the Slack UI
    captureExceptionAndLogIfDevelopment(error, { level: "info" });
  }

  await db
    .update(mailboxes)
    .set({
      slackTeamId: null,
      slackBotUserId: null,
      slackBotToken: null,
      slackAlertChannel: null,
    })
    .where(eq(mailboxes.id, mailboxId));
};

export const getResponseGeneratorPromptText = (responseGeneratorPrompt: string[]): string => {
  return responseGeneratorPrompt.join("\n");
};

export const getLatestEvents = async (mailbox: Mailbox, before?: Date) => {
  const messages = await db.query.conversationMessages.findMany({
    columns: {
      id: true,
      createdAt: true,
      role: true,
      clerkUserId: true,
      cleanedUpText: true,
      emailTo: true,
    },
    with: {
      conversation: {
        columns: { subject: true, emailFrom: true, slug: true },
        with: {
          platformCustomer: { columns: { value: true } },
        },
      },
    },
    where: and(
      inArray(
        conversationMessages.conversationId,
        db.select({ id: conversations.id }).from(conversations).where(eq(conversations.mailboxId, mailbox.id)),
      ),
      inArray(conversationMessages.role, ["user", "staff", "ai_assistant"]),
      before ? lt(conversationMessages.createdAt, before) : undefined,
    ),
    orderBy: desc(conversationMessages.createdAt),
    limit: 20,
  });

  const earliestMessageTimestamp = new Date(Math.min(...messages.map((message) => message.createdAt.getTime())));

  const messageEvents = messages.map((message) => ({
    type: message.role === "ai_assistant" ? "ai_reply" : message.emailTo ? ("email" as const) : ("chat" as const),
    id: `${message.id}-message`,
    conversationSlug: message.conversation.slug,
    emailFrom: message.conversation.emailFrom,
    title: message.conversation.subject,
    value: message.conversation.platformCustomer?.value ?? null,
    isVip: determineVipStatus(message.conversation.platformCustomer?.value ?? null, mailbox.vipThreshold),
    description: message.cleanedUpText,
    timestamp: message.createdAt,
  }));

  const reactions = await db.query.conversationMessages.findMany({
    columns: {
      id: true,
      reactionType: true,
      reactionFeedback: true,
      reactionCreatedAt: true,
    },
    with: {
      conversation: {
        columns: { subject: true, emailFrom: true, slug: true },
        with: {
          platformCustomer: { columns: { value: true } },
        },
      },
    },
    where: and(
      inArray(
        conversationMessages.conversationId,
        db.select({ id: conversations.id }).from(conversations).where(eq(conversations.mailboxId, mailbox.id)),
      ),
      isNotNull(conversationMessages.reactionType),
      isNotNull(conversationMessages.reactionCreatedAt),
      gte(conversationMessages.reactionCreatedAt, earliestMessageTimestamp),
      before ? lt(conversationMessages.reactionCreatedAt, before) : undefined,
    ),
    orderBy: desc(conversationMessages.reactionCreatedAt),
    limit: 20,
  });

  const reactionEvents = reactions.map((message) => ({
    type: message.reactionType === "thumbs-up" ? ("good_reply" as const) : ("bad_reply" as const),
    id: `${message.id}-reaction`,
    conversationSlug: message.conversation.slug,
    emailFrom: message.conversation.emailFrom,
    title: message.conversation.subject,
    value: message.conversation.platformCustomer?.value ?? null,
    isVip: determineVipStatus(message.conversation.platformCustomer?.value ?? null, mailbox.vipThreshold),
    description: message.reactionFeedback,
    timestamp: message.reactionCreatedAt!,
  }));

  const humanSupportRequests = await db.query.conversationEvents.findMany({
    where: and(
      inArray(
        conversationEvents.conversationId,
        db.select({ id: conversations.id }).from(conversations).where(eq(conversations.mailboxId, mailbox.id)),
      ),
      eq(conversationEvents.type, "request_human_support"),
      gte(conversationEvents.createdAt, earliestMessageTimestamp),
      before ? lt(conversationEvents.createdAt, before) : undefined,
    ),
    with: {
      conversation: {
        columns: { subject: true, emailFrom: true, slug: true },
        with: {
          platformCustomer: { columns: { value: true } },
        },
      },
    },
    orderBy: desc(conversationEvents.createdAt),
    limit: 20,
  });

  const humanSupportRequestEvents = humanSupportRequests.map((request) => ({
    type: "human_support_request" as const,
    id: `${request.id}-human-support-request`,
    conversationSlug: request.conversation.slug,
    emailFrom: request.conversation.emailFrom,
    title: request.conversation.subject,
    value: request.conversation.platformCustomer?.value ?? null,
    isVip: determineVipStatus(request.conversation.platformCustomer?.value ?? null, mailbox.vipThreshold),
    timestamp: request.createdAt,
  }));

  return [...messageEvents, ...reactionEvents, ...humanSupportRequestEvents].toSorted(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );
};

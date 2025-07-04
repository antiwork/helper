import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { assertDefined } from "@/components/utils/assert";
import { db, Transaction } from "@/db/client";
import { mailboxes, mailboxesMetadataApi } from "@/db/schema";
import { env } from "@/lib/env";
import { getGitHubInstallUrl } from "@/lib/github/client";
import { uninstallSlackApp } from "@/lib/slack/client";
import { REQUIRED_SCOPES, SLACK_REDIRECT_URI } from "@/lib/slack/constants";
import { captureExceptionAndLogIfDevelopment } from "../shared/sentry";

export const getMailbox = cache(async (): Promise<typeof mailboxes.$inferSelect | null> => {
  const result = await db.query.mailboxes.findFirst({
    where: isNull(sql`${mailboxes.preferences}->>'disabled'`),
  });
  return result ?? null;
});

export const resetMailboxPromptUpdatedAt = async (tx: Transaction, mailboxId: number) => {
  await tx.update(mailboxes).set({ promptUpdatedAt: new Date() }).where(eq(mailboxes.id, mailboxId));
};

export type Mailbox = typeof mailboxes.$inferSelect;

const getSlackConnectUrl = (mailboxSlug: string): string | null => {
  if (!env.SLACK_CLIENT_ID) return null;

  const params = new URLSearchParams({
    scope: REQUIRED_SCOPES.join(","),
    redirect_uri: SLACK_REDIRECT_URI,
    client_id: env.SLACK_CLIENT_ID,
    state: JSON.stringify({ mailbox_slug: mailboxSlug }),
  });

  return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
};

export const getMailboxInfo = async (mailbox: typeof mailboxes.$inferSelect) => {
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
    preferences: mailbox.preferences,
    hasMetadataEndpoint: !!metadataEndpoint,
    metadataEndpoint: metadataEndpoint ?? null,
    slackConnected: !!mailbox.slackBotToken,
    slackConnectUrl: env.SLACK_CLIENT_ID ? getSlackConnectUrl(mailbox.slug) : null,
    slackAlertChannel: mailbox.slackAlertChannel,
    githubConnected: !!mailbox.githubInstallationId,
    githubConnectUrl: env.GITHUB_APP_ID ? getGitHubInstallUrl() : null,
    githubRepoOwner: mailbox.githubRepoOwner,
    githubRepoName: mailbox.githubRepoName,
    widgetHMACSecret: mailbox.widgetHMACSecret,
    widgetDisplayMode: mailbox.widgetDisplayMode,
    widgetDisplayMinValue: mailbox.widgetDisplayMinValue,
    widgetHost: mailbox.widgetHost,
    vipThreshold: mailbox.vipThreshold,
    vipChannelId: mailbox.vipChannelId,
    vipExpectedResponseHours: mailbox.vipExpectedResponseHours,
    autoCloseEnabled: mailbox.autoCloseEnabled,
    autoCloseDaysOfInactivity: mailbox.autoCloseDaysOfInactivity,
    firecrawlEnabled: !!env.FIRECRAWL_API_KEY,
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

export const disconnectGitHub = async (mailboxId: number): Promise<void> => {
  await db
    .update(mailboxes)
    .set({
      githubInstallationId: null,
      githubRepoOwner: null,
      githubRepoName: null,
    })
    .where(eq(mailboxes.id, mailboxId));
};

export const updateGitHubRepo = async (mailboxId: number, repoOwner: string, repoName: string): Promise<void> => {
  await db
    .update(mailboxes)
    .set({
      githubRepoOwner: repoOwner,
      githubRepoName: repoName,
    })
    .where(eq(mailboxes.id, mailboxId));
};

export const getAllMailboxes = cache(async (): Promise<Mailbox[]> => {
  return await db.query.mailboxes.findMany({
    where: isNull(sql`${mailboxes.preferences}->>'disabled'`),
  });
});

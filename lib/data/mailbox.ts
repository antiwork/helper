import "server-only";
import { eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { db, Transaction } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { env } from "@/lib/env";
import { getGitHubInstallUrl } from "@/lib/github/client";

export const getMailbox = cache(async (): Promise<typeof mailboxes.$inferSelect | null> => {
  const result = await db.query.mailboxes.findFirst({
    where: isNull(sql`${mailboxes.preferences}->>'disabled'`),
  });
  return result ?? null;
});

export const resetMailboxPromptUpdatedAt = async (tx: Transaction) => {
  await tx.update(mailboxes).set({ promptUpdatedAt: new Date() });
};

export type Mailbox = typeof mailboxes.$inferSelect;

export const getMailboxInfo = (mailbox: typeof mailboxes.$inferSelect) => ({
  id: mailbox.id,
  name: mailbox.name,
  slug: mailbox.slug,
  preferences: mailbox.preferences,
  githubConnected: !!mailbox.githubInstallationId,
  githubConnectUrl: env.GITHUB_APP_ID ? getGitHubInstallUrl() : null,
  githubRepoOwner: mailbox.githubRepoOwner,
  githubRepoName: mailbox.githubRepoName,
  widgetHMACSecret: mailbox.widgetHMACSecret,
  widgetDisplayMode: mailbox.widgetDisplayMode,
  widgetDisplayMinValue: mailbox.widgetDisplayMinValue,
  widgetHost: mailbox.widgetHost,
  vipThreshold: mailbox.vipThreshold,
  vipExpectedResponseHours: mailbox.vipExpectedResponseHours,
  autoCloseEnabled: mailbox.autoCloseEnabled,
  autoCloseDaysOfInactivity: mailbox.autoCloseDaysOfInactivity,
  firecrawlEnabled: !!env.FIRECRAWL_API_KEY,
});

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

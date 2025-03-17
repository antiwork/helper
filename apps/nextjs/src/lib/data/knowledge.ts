import { User } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { updateSlackMessage } from "@/lib/slack/client";
import { suggestedEditAttachments } from "@/lib/slack/shared";

/**
 * Approves a suggested knowledge bank edit
 */
export const approveSuggestedEdit = async (
  faqId: number,
  user: User,
  slackChannel: string | null = null,
  slackMessageTs: string | null = null,
  slackBotToken: string | null = null,
) => {
  const faq = await db.query.faqs.findFirst({
    where: eq(faqs.id, faqId),
    with: { mailbox: true },
  });

  if (!faq) throw new Error(`FAQ not found: ${faqId}`);

  await db.transaction(async (tx) => {
    await tx.update(faqs).set({ enabled: true, suggested: false }).where(eq(faqs.id, faqId));

    // If this is a replacement suggestion, delete the original entry
    if (faq.suggestedReplacementForId) {
      await tx.delete(faqs).where(eq(faqs.id, faq.suggestedReplacementForId));
    }

    await resetMailboxPromptUpdatedAt(tx, faq.mailboxId);

    inngest.send({
      name: "faqs/embedding.create",
      data: { faqId },
    });
  });

  // Update the Slack message if available
  if (slackChannel && slackMessageTs && slackBotToken) {
    const blocks = suggestedEditAttachments(faq, faq.mailbox.slug, "approved", user?.fullName ?? null);

    await updateSlackMessage({
      token: slackBotToken,
      channel: slackChannel,
      ts: slackMessageTs,
      blocks,
    });
  }
};

/**
 * Rejects a suggested knowledge bank edit
 */
export const rejectSuggestedEdit = async (
  faqId: number,
  user: User,
  slackChannel: string | null = null,
  slackMessageTs: string | null = null,
  slackBotToken: string | null = null,
) => {
  const faq = await db.query.faqs.findFirst({
    where: eq(faqs.id, faqId),
    with: { mailbox: true },
  });

  if (!faq) throw new Error(`FAQ not found: ${faqId}`);

  await db.transaction(async (tx) => {
    await tx.delete(faqs).where(eq(faqs.id, faqId));
    await resetMailboxPromptUpdatedAt(tx, faq.mailboxId);
  });

  // Update the Slack message if available
  if (slackChannel && slackMessageTs && slackBotToken) {
    const blocks = suggestedEditAttachments(faq, faq.mailbox.slug, "rejected", user?.fullName ?? null);

    await updateSlackMessage({
      token: slackBotToken,
      channel: slackChannel,
      ts: slackMessageTs,
      blocks,
    });
  }
};

/**
 * Tweaks and approves a suggested knowledge bank edit
 */
export const tweakAndApproveSuggestedEdit = async (
  faqId: number,
  content: string,
  user: User,
  slackChannel: string | null = null,
  slackMessageTs: string | null = null,
  slackBotToken: string | null = null,
) => {
  const faq = await db.query.faqs.findFirst({
    where: eq(faqs.id, faqId),
    with: { mailbox: true },
  });

  if (!faq) throw new Error(`FAQ not found: ${faqId}`);

  await db.transaction(async (tx) => {
    await tx.update(faqs).set({ content, enabled: true, suggested: false }).where(eq(faqs.id, faqId));

    // If this is a replacement suggestion, delete the original entry
    if (faq.suggestedReplacementForId) {
      await tx.delete(faqs).where(eq(faqs.id, faq.suggestedReplacementForId));
    }

    await resetMailboxPromptUpdatedAt(tx, faq.mailboxId);

    inngest.send({
      name: "faqs/embedding.create",
      data: { faqId },
    });
  });

  // Update the Slack message if available
  if (slackChannel && slackMessageTs && slackBotToken) {
    const blocks = suggestedEditAttachments(faq, faq.mailbox.slug, "tweaked", user?.fullName ?? null);

    await updateSlackMessage({
      token: slackBotToken,
      channel: slackChannel,
      ts: slackMessageTs,
      blocks,
    });
  }
};

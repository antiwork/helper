import { User } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { faqs, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";
import { updateSlackMessage } from "@/lib/slack/client";
import { suggestionResolvedBlocks } from "@/lib/slack/shared";

/**
 * Approves a suggested knowledge bank edit
 */
export const approveSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  user: User | null,
  content?: string,
) => {
  await db.transaction(async (tx) => {
    await tx
      .update(faqs)
      .set({ enabled: true, suggested: false, content: content ?? knowledge.content })
      .where(eq(faqs.id, knowledge.id));
    if (knowledge.suggestedReplacementForId) {
      await tx.delete(faqs).where(eq(faqs.id, knowledge.suggestedReplacementForId));
    }

    await resetMailboxPromptUpdatedAt(tx, knowledge.mailboxId);

    inngest.send({
      name: "faqs/embedding.create",
      data: { faqId: knowledge.id },
    });
  });

  if (knowledge.slackChannel && knowledge.slackMessageTs && mailbox.slackBotToken) {
    const blocks = suggestionResolvedBlocks(knowledge, mailbox.slug, "approved", user?.fullName ?? null);

    await updateSlackMessage({
      token: mailbox.slackBotToken,
      channel: knowledge.slackChannel,
      ts: knowledge.slackMessageTs,
      blocks,
    });
  }
};

export const rejectSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  mailbox: typeof mailboxes.$inferSelect,
  user: User | null,
) => {
  await db.transaction(async (tx) => {
    await tx.delete(faqs).where(eq(faqs.id, knowledge.id));
    await resetMailboxPromptUpdatedAt(tx, knowledge.mailboxId);
  });

  if (knowledge.slackChannel && knowledge.slackMessageTs && mailbox.slackBotToken) {
    const blocks = suggestionResolvedBlocks(knowledge, mailbox.slug, "rejected", user?.fullName ?? null);

    await updateSlackMessage({
      token: mailbox.slackBotToken,
      channel: knowledge.slackChannel,
      ts: knowledge.slackMessageTs,
      blocks,
    });
  }
};

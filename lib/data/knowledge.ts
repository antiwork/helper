import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { BasicUserProfile, faqs, mailboxes } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { resetMailboxPromptUpdatedAt } from "@/lib/data/mailbox";

export const approveSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  _mailbox: typeof mailboxes.$inferSelect,
  _user: BasicUserProfile | null,
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

    await resetMailboxPromptUpdatedAt(tx);

    await triggerEvent("faqs/embedding.create", { faqId: knowledge.id });
  });
};

export const rejectSuggestedEdit = async (
  knowledge: typeof faqs.$inferSelect,
  _mailbox: typeof mailboxes.$inferSelect,
  _user: BasicUserProfile | null,
) => {
  await db.transaction(async (tx) => {
    await tx.delete(faqs).where(eq(faqs.id, knowledge.id));
    await resetMailboxPromptUpdatedAt(tx);
  });
};

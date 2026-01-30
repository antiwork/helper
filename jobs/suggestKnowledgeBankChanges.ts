import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, faqs, mailboxes } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { generateKnowledgeBankSuggestion } from "@/lib/ai/knowledgeBankSuggestions";
import { getMailbox } from "@/lib/data/mailbox";
import { postGoogleChatMessage } from "@/lib/googleChat/client";
import { getSuggestedEditButtons } from "@/lib/slack/shared";

export const suggestKnowledgeBankChanges = async ({
  messageId,
  reason,
}: {
  messageId: number;
  reason: string | null;
}) => {
  const message = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, messageId),
      with: {
        conversation: {
          with: {},
        },
      },
    }),
  );

  const mailbox = assertDefined(await getMailbox());
  const messageContent = message.body || message.cleanedUpText || "";
  const flagReason = reason || "No reason provided";

  const existingSuggestions = await db.query.faqs.findMany({
    where: eq(faqs.suggested, true),
  });

  const suggestion = await generateKnowledgeBankSuggestion(mailbox, {
    type: "bad_response",
    messageContent,
    additionalContext: flagReason,
  });

  if (suggestion.action === "create_entry") {
    const newFaq = await db
      .insert(faqs)
      .values({
        content: suggestion.content || "",
        suggested: true,
        enabled: false,
        messageId: message.id,
      })
      .returning()
      .then(takeUniqueOrThrow);

    notifySuggestedEdit(newFaq, mailbox);
  } else if (suggestion.action === "update_entry" && suggestion.entryId) {
    const suggestionToUpdate =
      existingSuggestions.find((faq) => faq.id === suggestion.entryId) ||
      (await db.query.faqs.findFirst({
        where: eq(faqs.suggestedReplacementForId, suggestion.entryId),
      }));
    if (suggestionToUpdate) {
      await db
        .update(faqs)
        .set({
          content: suggestion.content || "",
          messageId: message.id,
        })
        .where(eq(faqs.id, suggestion.entryId));
    } else {
      const newFaq = await db
        .insert(faqs)
        .values({
          content: suggestion.content || "",
          suggested: true,
          enabled: false,
          suggestedReplacementForId: suggestion.action === "update_entry" ? suggestion.entryId : null,
          messageId: message.id,
        })
        .returning()
        .then(takeUniqueOrThrow);

      notifySuggestedEdit(newFaq, mailbox);
    }
  }

  return suggestion;
};

const notifySuggestedEdit = async (faq: typeof faqs.$inferSelect, mailbox: typeof mailboxes.$inferSelect) => {
  if (!mailbox.googleChatWebhookUrl) {
    return "Not posted, mailbox not linked to Google Chat webhook";
  }

  let originalContent = "";
  if (faq.suggestedReplacementForId) {
    const replacementFaq = await db.query.faqs.findFirst({
      where: eq(faqs.id, faq.suggestedReplacementForId),
    });
    originalContent = replacementFaq?.content ?? "";
  }

  const text = originalContent
    ? `💡 New suggested edit for the knowledge bank\n\nSuggested content:\n${faq.content}\n\nThis will overwrite the current entry:\n${originalContent}\n\nView knowledge bank: ${getBaseUrl()}/settings/knowledge`
    : `💡 New suggested addition to the knowledge bank\n\nSuggested content:\n${faq.content}\n\nView knowledge bank: ${getBaseUrl()}/settings/knowledge`;

  await postGoogleChatMessage(mailbox.googleChatWebhookUrl, text);

  // Optionally, store Google Chat info if needed
  // await db
  //   .update(faqs)
  //   .set({ googleChatWebhookUrl: mailbox.googleChatWebhookUrl })
  //   .where(eq(faqs.id, faq.id));
};

import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/components/constants";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, faqs, mailboxes } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { generateKnowledgeBankSuggestion } from "@/lib/ai/knowledgeBankSuggestions";
import { getMailbox } from "@/lib/data/mailbox";

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

    // Suggestions are now visible in the Knowledge Bank UI at /settings/knowledge
    // Email notifications for knowledge bank suggestions could be added here if needed
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

      // Suggestions are now visible in the Knowledge Bank UI at /settings/knowledge
      // Email notifications for knowledge bank suggestions could be added here if needed
    }
  }

  return suggestion;
};

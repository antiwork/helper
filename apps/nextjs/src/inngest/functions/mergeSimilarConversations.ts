import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { inngest } from "@/inngest/client";
import { getMailboxById } from "@/lib/data/mailbox";
import { findSimilarConversations } from "@/lib/data/retrieval";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

export default inngest.createFunction(
  {
    id: "detect-similar-conversations",
    debounce: { key: "event.data.messageId", period: "1m", timeout: "5m" },
  },
  { event: "conversations/embedding.generated" },
  async ({ event }) => {
    const { conversationId } = event.data;

    const conversation = assertDefinedOrRaiseNonRetriableError(
      await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          messages: {
            columns: {
              id: true,
              role: true,
            },
          },
        },
      }),
    );

    if (!conversation.emailFrom) return { message: "Skipped: no email from" };
    if (!conversation.embedding) return { message: "Skipped: no embedding text" };
    if (conversation.mergedIntoId) return { message: "Skipped: conversation is already merged" };

    const userMessageCount = conversation.messages.filter((m) => m.role === "user").length;
    if ((conversation.isPrompt && userMessageCount !== 2) || (!conversation.isPrompt && userMessageCount !== 1)) {
      return { message: "Skipped: not the first message" };
    }

    const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(conversation.mailboxId));

    // TODO: use AI, not similar conversations
    // TODO: what happens when opening the conversation? open the merged one, right?

    const similarConversations = await findSimilarConversations({
      query: conversation.embedding,
      mailbox,
      limit: 5,
      excludeConversationSlug: conversation.slug,
      similarityThreshold: 0.7,
    });

    if (!similarConversations?.[0]) return { message: "No similar conversations found" };

    await db
      .update(conversations)
      .set({ mergedIntoId: similarConversations[0].id })
      .where(eq(conversations.id, conversation.id));

    return { message: `Conversation ${conversation.id} merged into ${similarConversations[0].id}` };
  },
);

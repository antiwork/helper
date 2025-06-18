import { and, eq, gt, gte, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { triggerEvent } from "@/jobs/trigger";

const BATCH_SIZE = 50;
const CLOSED_STATUS = "closed";
const MAX_CONVERSATIONS = 5000;

export const bulkEmbeddingClosedConversations = async () => {
  let lastId = 0;
  let processedConversations = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  while (processedConversations < MAX_CONVERSATIONS) {
    const conversationsBatch = await db
      .select({
        id: conversations.id,
        slug: conversations.slug,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.status, CLOSED_STATUS),
          isNull(conversations.embedding),
          gt(conversations.id, lastId),
          gte(conversations.closedAt, thirtyDaysAgo),
        ),
      )
      .orderBy(conversations.id)
      .limit(BATCH_SIZE);

    if (!conversationsBatch || conversationsBatch.length === 0) {
      break;
    }

    const events = conversationsBatch.map(
      (conversation): { name: "conversations/embedding.create"; data: { conversationSlug: string } } => ({
        name: "conversations/embedding.create",
        data: { conversationSlug: conversation.slug },
      }),
    );

    await Promise.all(events.map((event) => triggerEvent(event.name, event.data)));

    processedConversations += conversationsBatch.length;
    lastId = conversationsBatch[conversationsBatch.length - 1]?.id ?? lastId;
  }

  return { success: true, processedConversations };
};

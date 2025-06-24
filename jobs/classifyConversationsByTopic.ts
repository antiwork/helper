import { isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { generateIssueTopic } from "@/lib/ai/generateIssueTopic";

export async function classifyConversationsByTopic() {
  const conversationsToClassify = await db.query.conversations.findMany({
    where: isNull(conversations.issueTopicId),
  });

  if (conversationsToClassify.length === 0) {
    return { status: "No conversations to classify" };
  }

  let classifiedCount = 0;
  for (const conversation of conversationsToClassify) {
    try {
      const classified = await generateIssueTopic(conversation);
      if (classified) {
        classifiedCount++;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to classify conversation ${conversation.id}:`, error);
    }
  }

  return {
    status: `Attempted to classify ${conversationsToClassify.length} conversations. Successfully classified ${classifiedCount}.`,
  };
}

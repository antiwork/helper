import { and, desc, eq, isNull, not, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, conversationsTopics } from "@/db/schema";
import { inngest } from "@/inngest/client";

const BATCH_SIZE = 100;
const GUMROAD_MAILBOX_ID = 1;

export const findAndAssignMissingTopics = async () => {
  const baseQuery = db
    .select({
      id: conversations.id,
      mailboxId: conversations.mailboxId,
    })
    .from(conversations)
    .leftJoin(conversationsTopics, sql`${conversations.id} = ${conversationsTopics.conversationId}`)
    .where(
      and(
        isNull(conversationsTopics.id),
        not(eq(conversations.isPrompt, true)),
        not(eq(conversations.status, "spam")),
        eq(conversations.mailboxId, GUMROAD_MAILBOX_ID),
      ),
    );

  const [{ count: totalCount }] = (await db.select({ count: sql<number>`count(*)` }).from(baseQuery.as("base"))) as [
    { count: number },
  ];
  const conversationsWithoutTopics = await baseQuery.orderBy(desc(conversations.createdAt)).limit(BATCH_SIZE);

  const events = conversationsWithoutTopics.map((conversation) => ({
    name: "conversations/topic.assign" as const,
    data: {
      conversationId: conversation.id,
    },
  }));

  if (events.length > 0) {
    await inngest.send(events);
  }

  return {
    processed: events.length,
    remaining: totalCount - events.length,
    message: `Processed ${events.length} conversations, ${totalCount - events.length} remaining`,
  };
};

export default inngest.createFunction(
  { id: "bulk-assign-missing-topics" },
  { cron: "0 */6 * * *" }, // Run every 6 hours
  async () => {
    const result = await findAndAssignMissingTopics();
    return { result };
  },
);

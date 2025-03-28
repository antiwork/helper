import { relations } from "drizzle-orm";
import { bigint, index, pgTable, timestamp } from "drizzle-orm/pg-core";
import { conversations } from "./conversations";
import { mailboxes } from "./mailboxes";
import { topics } from "./topics";

export const conversationsTopics = pgTable(
  "conversations_topics",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    conversationId: bigint({ mode: "number" }).notNull(),
    topicId: bigint({ mode: "number" }).notNull(),
    subTopicId: bigint({ mode: "number" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    mailboxId: bigint({ mode: "number" }).notNull(),
  },
  (table) => ({
    conversationIdIdx: index("conversations_topics_conversation_id_idx").on(table.conversationId),
    topicIdIdx: index("conversations_topics_topic_id_idx").on(table.topicId),
    subTopicIdIdx: index("conversations_topics_sub_topic_id_idx").on(table.subTopicId),
    createdAtIdx: index("conversations_topics_created_at_idx").on(table.createdAt),
    mailboxIdIdx: index("conversations_topics_mailbox_id_idx").on(table.mailboxId),
  }),
);

export const conversationsTopicsRelations = relations(conversationsTopics, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationsTopics.conversationId],
    references: [conversations.id],
  }),
  topic: one(topics, {
    fields: [conversationsTopics.topicId],
    references: [topics.id],
    relationName: "conversation_main_topic_relation",
  }),
  subTopic: one(topics, {
    fields: [conversationsTopics.subTopicId],
    references: [topics.id],
    relationName: "conversation_sub_topic_relation",
  }),
  mailbox: one(mailboxes, {
    fields: [conversationsTopics.mailboxId],
    references: [mailboxes.id],
  }),
}));

export type ConversationTopic = typeof conversationsTopics.$inferSelect;
export type InsertConversationTopic = typeof conversationsTopics.$inferInsert;

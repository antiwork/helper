import { relations } from "drizzle-orm";
import { bigint, boolean, index, pgTable, text, unique, vector } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversationMessages } from "./conversationMessages";
import { mailboxes } from "./mailboxes";

export const faqs = pgTable(
  "faqs",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    content: text("reply").notNull(),
    mailboxId: bigint({ mode: "number" }).notNull(),
    embedding: vector({ dimensions: 1536 }),
    enabled: boolean().notNull().default(true),
    suggested: boolean().notNull().default(false),
    suggestedReplacementForId: bigint({ mode: "number" }),
    messageId: bigint({ mode: "number" }),
    slackChannel: text(),
    slackMessageTs: text(),
  },
  (table) => {
    return {
      createdAtIdx: index("faqs_mailbox_created_at_idx").on(table.createdAt),
      mailboxIdIdx: index("faqs_mailbox_id_idx").on(table.mailboxId),
      faqEmbeddingIdx: index("faqs_embedding_index").using(
        "hnsw",
        table.embedding.asc().nullsLast().op("vector_cosine_ops"),
      ),
      messageIdUnique: unique("faqs_message_id_key").on(table.messageId),
    };
  },
);

export const faqsRelations = relations(faqs, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [faqs.mailboxId],
    references: [mailboxes.id],
  }),
  message: one(conversationMessages, {
    fields: [faqs.messageId],
    references: [conversationMessages.id],
  }),
}));

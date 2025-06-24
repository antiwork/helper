import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, vector } from "drizzle-orm/pg-core";
import { mailboxes } from "@/db/schema/mailboxes";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const issueTopics = pgTable(
  "issue_topics",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    mailboxId: bigint({ mode: "number" }).notNull(),
    summary: text().notNull(),
    embedding: vector({ dimensions: 1536 }),
  },
  (table) => [
    index("issue_topics_embedding_vector_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
    index("issue_topics_mailbox_id_idx").on(table.mailboxId),
  ],
);

export const issueTopicsRelations = relations(issueTopics, ({ one, many }) => ({
  conversations: many(conversations),
  mailbox: one(mailboxes, {
    fields: [issueTopics.mailboxId],
    references: [mailboxes.id],
  }),
}));

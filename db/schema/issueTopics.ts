import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, vector } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const issueTopics = pgTable(
  "issue_topics",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    summary: text().notNull(),
    embedding: vector({ dimensions: 1536 }),
  },
  (table) => [
    index("issue_topics_embedding_vector_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
  ],
);

export const issueTopicsRelations = relations(issueTopics, ({ many }) => ({
  conversations: many(conversations),
}));

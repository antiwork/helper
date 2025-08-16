import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, vector } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const issueGroups = pgTable(
  "issue_groups",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    title: text().notNull(),
    description: text(),
    embedding: vector({ dimensions: 1536 }),
  },
  (table) => [
    index("issue_groups_created_at_idx").on(table.createdAt),
    index("issue_groups_embedding_idx").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
  ],
).enableRLS();

export const issueGroupsRelations = relations(issueGroups, ({ many }) => ({
  conversations: many(conversations),
}));

import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export const topics = pgTable(
  "topics",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text("name").notNull(),
    customName: text("custom_name"),
    parentId: bigint({ mode: "number" }),
    mailboxId: bigint({ mode: "number" }),
  },
  (table) => ({
    parentIdIdx: index("topics_parent_id_idx").on(table.parentId),
    mailboxIdIdx: index("topics_mailbox_id_idx").on(table.mailboxId),
  }),
);

export const topicsRelations = relations(topics, ({ many, one }) => ({
  parent: one(topics, {
    fields: [topics.parentId],
    references: [topics.id],
  }),
  children: many(topics),
  mailbox: one(mailboxes, {
    fields: [topics.mailboxId],
    references: [mailboxes.id],
  }),
}));

export type Topic = typeof topics.$inferSelect;
export type InsertTopic = typeof topics.$inferInsert;

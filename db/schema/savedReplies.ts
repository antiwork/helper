import { relations } from "drizzle-orm";
import { bigint, boolean, index, integer, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { mailboxes } from "@/db/schema/mailboxes";
import { randomSlugField } from "../lib/random-slug-field";
import { withTimestamps } from "../lib/with-timestamps";

export const savedReplies = pgTable(
  "saved_replies",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    slug: randomSlugField("slug"),
    name: varchar({ length: 100 }).notNull(),
    content: text().notNull(),
    unused_mailboxId: bigint("mailbox_id", { mode: "number" })
      .notNull()
      .references(() => mailboxes.id, { onDelete: "cascade" }),
    createdByUserId: text("created_by_user_id"),
    isActive: boolean().notNull().default(true),
    usageCount: integer().notNull().default(0),
  },
  (table) => [
    index("saved_replies_mailbox_id_idx").on(table.unused_mailboxId),
    index("saved_replies_created_by_user_idx").on(table.createdByUserId),
    index("saved_replies_slug_idx").on(table.slug),
    uniqueIndex("saved_replies_slug_mailbox_unique").on(table.slug, table.unused_mailboxId),
  ],
).enableRLS();

export type SavedReply = typeof savedReplies.$inferSelect;

export const savedRepliesRelations = relations(savedReplies, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [savedReplies.unused_mailboxId],
    references: [mailboxes.id],
  }),
}));

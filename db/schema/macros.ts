import { relations, sql } from "drizzle-orm";
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
    description: varchar({ length: 500 }),
    mailboxId: bigint({ mode: "number" }).notNull(),
    createdByUserId: text("created_by_user_id"),
    isActive: boolean().notNull().default(true),
    shortcut: varchar({ length: 20 }),
    usageCount: integer().notNull().default(0),
  },
  (table) => [
    index("saved_replies_mailbox_id_idx").on(table.mailboxId),
    index("saved_replies_created_by_user_idx").on(table.createdByUserId),
    index("saved_replies_slug_idx").on(table.slug),
    index("saved_replies_shortcut_idx").on(table.shortcut),
    uniqueIndex("saved_replies_mailbox_shortcut_unique")
      .on(table.mailboxId, table.shortcut)
      .where(sql`shortcut IS NOT NULL`),
  ],
).enableRLS();

export const savedRepliesRelations = relations(savedReplies, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [savedReplies.mailboxId],
    references: [mailboxes.id],
  }),
}));

// Keep the old export for backwards compatibility during migration
export const macros = savedReplies;
export const macrosRelations = savedRepliesRelations;

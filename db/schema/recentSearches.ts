import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export const recentSearches = pgTable(
  "recent_searches",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    userId: text("user_id").notNull(),
    mailboxId: bigint({ mode: "number" }).notNull(),
    searchTerm: text("search_term").notNull(),
    lastUsedAt: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("recent_searches_user_id_idx").on(table.userId),
    index("recent_searches_mailbox_id_idx").on(table.mailboxId),
    index("recent_searches_user_mailbox_idx").on(table.userId, table.mailboxId),
    index("recent_searches_last_used_at_idx").on(table.lastUsedAt.desc()),
  ],
).enableRLS();

export const recentSearchesRelations = relations(recentSearches, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [recentSearches.mailboxId],
    references: [mailboxes.id],
  }),
}));

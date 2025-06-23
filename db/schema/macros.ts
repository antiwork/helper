import { relations, sql } from "drizzle-orm";
import { bigint, boolean, index, integer, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { mailboxes } from "@/db/schema/mailboxes";
import { randomSlugField } from "../lib/random-slug-field";
import { withTimestamps } from "../lib/with-timestamps";

export const macros = pgTable(
  "macros_macro",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    slug: randomSlugField("slug"),
    name: varchar({ length: 100 }).notNull(),
    content: text().notNull(),
    description: varchar({ length: 500 }),
    mailboxId: bigint({ mode: "number" }).notNull(),
    createdByUserId: text("created_by_user_id"),
    isGlobal: boolean().notNull().default(false),
    isActive: boolean().notNull().default(true),
    shortcut: varchar({ length: 20 }),
    category: varchar({ length: 50 }),
    usageCount: integer().notNull().default(0),
  },
  (table) => [
    index("macros_macro_mailbox_id_idx").on(table.mailboxId),
    index("macros_macro_created_by_user_idx").on(table.createdByUserId),
    index("macros_macro_slug_idx").on(table.slug),
    index("macros_macro_category_idx").on(table.category),
    index("macros_macro_is_global_idx").on(table.isGlobal),
    index("macros_macro_shortcut_idx").on(table.shortcut),
    uniqueIndex("macros_macro_mailbox_shortcut_unique").on(table.mailboxId, table.shortcut).where(sql`shortcut IS NOT NULL`),
  ],
).enableRLS();

export const macrosRelations = relations(macros, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [macros.mailboxId],
    references: [mailboxes.id],
  }),
}));

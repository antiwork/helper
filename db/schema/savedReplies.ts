import { relations } from "drizzle-orm";
import { bigint, boolean, index, integer, pgTable, text, uniqueIndex, varchar } from "drizzle-orm/pg-core";
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
    createdByUserId: text("created_by_user_id"),
    isActive: boolean().notNull().default(true),
    usageCount: integer().notNull().default(0),
  },
  (table) => [
    index("saved_replies_created_by_user_idx").on(table.createdByUserId),
    index("saved_replies_slug_idx").on(table.slug),
    uniqueIndex("saved_replies_slug_unique").on(table.slug),
  ],
).enableRLS();

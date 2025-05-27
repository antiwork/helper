import { bigint, index, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const cache = pgTable(
  "cache",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    key: text().notNull(),
    value: jsonb().notNull(),
    expiresAt: timestamp(),
  },
  (table) => [unique("cache_key_idx").on(table.key), index("cache_expires_at_idx").on(table.expiresAt)],
).enableRLS();

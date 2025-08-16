import { sql } from "drizzle-orm";
import { bigint, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { ToolRequestBody } from "@helperai/client";
import { withTimestamps } from "../lib/with-timestamps";

export const cachedClientTools = pgTable(
  "cached_client_tools",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    customerEmail: text(),
    tools: jsonb().$type<Record<string, ToolRequestBody>>().notNull(),
  },
  (table) => [
    uniqueIndex("cached_client_tools_email_unique")
      .on(table.customerEmail)
      .where(sql`${table.customerEmail} IS NOT NULL`),
  ],
).enableRLS();

export type CachedClientTools = typeof cachedClientTools.$inferSelect;

import { bigint, index, jsonb, pgTable, sql, text, uniqueIndex } from "drizzle-orm/pg-core";
import { ToolRequestBody } from "@helperai/client";
import { withTimestamps } from "../lib/with-timestamps";

export const cachedClientTools = pgTable(
  "cached_client_tools",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),

    // Fallback identifier if platformCustomerId is unavailable
    customerEmail: text(), // nullable

    // Preferred identifier
    platformCustomerId: bigint("platform_customer_id", { mode: "number" }),

    tools: jsonb().$type<Record<string, ToolRequestBody>>().notNull(),
  },
  (table) => [
    uniqueIndex("cached_client_tools_email_unique")
      .on(table.customerEmail)
      .where(sql`${table.customerEmail} IS NOT NULL`),
    uniqueIndex("cached_client_tools_platform_unique")
      .on(table.platformCustomerId)
      .where(sql`${table.platformCustomerId} IS NOT NULL`),
  ],
).enableRLS();

export type CachedClientTools = typeof cachedClientTools.$inferSelect;

import { bigint, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { ToolRequestBody } from "@helperai/client";
import { withTimestamps } from "../lib/with-timestamps";

export const cachedClientTools = pgTable(
  "cached_client_tools",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),

    // Fallback identifier if platformCustomerId is unavailable
    customerEmail: text(), // now nullable

    // Preferred identifier
    platformCustomerId: bigint("platform_customer_id", { mode: "number" }),

    tools: jsonb().$type<Record<string, ToolRequestBody>>().notNull(),
  },
  (table) => [
    index("cached_client_tools_customer_idx").on(table.customerEmail),
    index("cached_client_tools_platform_customer_idx").on(table.platformCustomerId),
  ],
).enableRLS();

export type CachedClientTools = typeof cachedClientTools.$inferSelect;

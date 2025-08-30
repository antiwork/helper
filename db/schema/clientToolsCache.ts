import { bigint, index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export type ClientToolCache = typeof clientToolsCache.$inferSelect;
export type ClientToolCacheInsert = typeof clientToolsCache.$inferInsert;

export const clientToolsCache = pgTable(
  "client_tools_cache",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    toolName: text("tool_name").notNull(),
    description: text().notNull(),
    parameters: jsonb()
      .notNull()
      .$type<Record<string, { type: "string" | "number"; description?: string; optional?: boolean }>>(),
    serverRequestUrl: text("server_request_url").notNull(),
    customerEmail: text("customer_email").notNull().default(""),
    platformCustomerId: text("platform_customer_id").notNull().default(""),
  },
  (table) => [
    index("client_tools_cache_customer_email_idx").on(table.customerEmail),
    index("client_tools_cache_platform_customer_id_idx").on(table.platformCustomerId),
    uniqueIndex("unique_client_tool_customer_idx").on(table.toolName, table.customerEmail, table.platformCustomerId),
  ],
).enableRLS();

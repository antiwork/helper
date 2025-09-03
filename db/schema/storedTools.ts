import { sql } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export type StoredToolParameter = {
  name: string;
  description: string | null;
  type: "string" | "number";
  optional: boolean;
};
type StoredToolParameters = StoredToolParameter[];

export type StoredTool = typeof storedTools.$inferSelect;

export const storedTools = pgTable(
  "stored_tools",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text().notNull(),
    customerEmail: text(),
    description: text(),
    parameters: jsonb().notNull().default("[]").$type<StoredToolParameters>(),
    serverRequestUrl: text(),
  },
  (table) => [
    uniqueIndex("unique_tool_idx").on(table.name, table.customerEmail),
    index("idx_stored_tools_customer_email")
      .on(table.customerEmail)
      .where(sql`${table.customerEmail} IS NOT NULL`),
  ],
).enableRLS();

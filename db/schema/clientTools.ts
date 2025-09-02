import { sql} from "drizzle-orm";
import { bigint, jsonb, pgTable, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export type ToolParameter = {
  name: string;
  description?: string;
  type: "string" | "number";
  optional?: boolean | undefined;
};
type ToolParameters = ToolParameter[];

export type ClientTool = typeof clientTools.$inferSelect;

export const clientTools = pgTable(
    "client_tools",
    {
        ...withTimestamps,
        id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
        name: text().notNull(),
        customerEmail: text(),
        description: text(),
        parameters: jsonb().default("[]").$type<ToolParameters>(),
        serverRequestUrl: text(),
    },
    (table) => [
        uniqueIndex("unique_tool_idx").on(table.name, table.customerEmail),
        index("idx_client_tools_customer_email").on(table.customerEmail).where(sql`${table.customerEmail} IS NOT NULL`),
    ],
).enableRLS();

import { sql} from "drizzle-orm";
import { bigint, jsonb, pgTable, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { ToolRequestBody } from "@helperai/client";

export const clientTools = pgTable(
    "client_tools",
    {
        ...withTimestamps,
        id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
        tool_name: text().notNull(),
        tool: jsonb().$type<ToolRequestBody>().notNull(),
        customer_email: text(),
    },
    (table) => [
        uniqueIndex("unique_tool_idx").on(table.tool_name, table.customer_email),
        index("idx_client_tools_customer_email").on(table.customer_email).where(sql`${table.customer_email} IS NOT NULL`),
    ],
).enableRLS();

import { relations } from "drizzle-orm";
import { bigint, boolean, index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";
import { toolApis } from "./toolApis";

type ToolAuthenticationMethod = "none" | "bearer_token";
type ToolRequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type ToolParameter = {
  name: string;
  description?: string;
  type: "string" | "number";
  in: "body" | "query" | "path";
  required: boolean;
};
type ToolParameters = ToolParameter[];
type ToolHeaders = Record<string, string>;
export type Tool = typeof tools.$inferSelect;

export const tools = pgTable(
  "tools",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text().notNull(),
    description: text().notNull(),
    unused_mailboxId: bigint("mailbox_id", { mode: "number" })
      .notNull()
      .$defaultFn(() => 0),
    slug: text().notNull(),
    requestMethod: text().notNull().$type<ToolRequestMethod>(),
    url: text().notNull(),
    headers: jsonb().default("{}").$type<ToolHeaders>(),
    parameters: jsonb().default("[]").$type<ToolParameters>(),
    authenticationMethod: text().notNull().default("none").$type<ToolAuthenticationMethod>(),
    authenticationToken: text("authentication_token"),
    toolApiId: bigint({ mode: "number" }),
    enabled: boolean().notNull().default(true),
    availableInChat: boolean().notNull().default(false),
    availableInAnonymousChat: boolean().notNull().default(false),
    customerEmailParameter: text(),
  },
  (table) => [
    index("tools_mailbox_id_idx").on(table.unused_mailboxId),
    index("tools_tool_api_id_idx").on(table.toolApiId),
    uniqueIndex("unique_slug_idx").on(table.slug),
  ],
).enableRLS();

export const toolsRelations = relations(tools, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [tools.unused_mailboxId],
    references: [mailboxes.id],
  }),
  toolApi: one(toolApis, {
    fields: [tools.toolApiId],
    references: [toolApis.id],
  }),
}));

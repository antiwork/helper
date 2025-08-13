import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";
import { tools } from "./tools";

const toolApis = pgTable(
  "tool_apis",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text().notNull(),
    unused_mailboxId: bigint("mailbox_id", { mode: "number" })
      .notNull()
      .$defaultFn(() => 0),
    baseUrl: text(),
    schema: text(),
    authenticationToken: text("authentication_token"),
  },
  (table) => [index("tool_apis_mailbox_id_idx").on(table.unused_mailboxId)],
).enableRLS();

export const toolApisRelations = relations(toolApis, ({ many, one }) => ({
  tools: many(tools),
  mailbox: one(mailboxes, {
    fields: [toolApis.unused_mailboxId],
    references: [mailboxes.id],
  }),
}));

export { toolApis };
export type ToolApi = typeof toolApis.$inferSelect;

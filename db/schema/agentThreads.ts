import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { agentMessages } from "@/db/schema/agentMessages";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export const agentThreads = pgTable(
  "agent_threads",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    unused_mailboxId: bigint("mailbox_id", { mode: "number" }).$defaultFn(() => 0),
    threadTs: text().notNull(),
  },
  (table) => [
    index("agent_threads_mailbox_id_idx").on(table.unused_mailboxId),
  ],
).enableRLS();

export const agentThreadsRelations = relations(agentThreads, ({ one, many }) => ({
  mailbox: one(mailboxes, {
    fields: [agentThreads.unused_mailboxId],
    references: [mailboxes.id],
  }),
  messages: many(agentMessages),
}));

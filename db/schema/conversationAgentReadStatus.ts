import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const conversationAgentReadStatus = pgTable(
  "conversation_agent_read_status",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    conversationId: bigint("conversation_id", { mode: "number" })
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    agentClerkId: text("agent_clerk_id").notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("conversation_agent_read_status_agent_clerk_id_idx").on(table.agentClerkId),
    index("conversation_agent_read_status_conversation_agent_idx").on(table.conversationId, table.agentClerkId),
    unique("conversation_agent_read_status_conversation_agent_unique").on(table.conversationId, table.agentClerkId),
  ],
).enableRLS();

export const conversationAgentReadStatusRelations = relations(conversationAgentReadStatus, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationAgentReadStatus.conversationId],
    references: [conversations.id],
  }),
}));

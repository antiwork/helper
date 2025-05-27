import { relations } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { agentThreads } from "./agentThreads";

export type AgentMessageRole = "user" | "assistant" | "tool";

export const agentMessages = pgTable(
  "agent_messages",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    agentThreadId: bigint({ mode: "number" }).notNull(),
    role: text().$type<AgentMessageRole>().notNull(),
    content: text().notNull(),
    metadata: jsonb().$type<{ toolName: string; parameters: Record<string, unknown> }>(),
    slackChannel: text(),
    messageTs: text(),
  },
  (table) => [
    index("agent_messages_agent_thread_id_idx").on(table.agentThreadId),
    uniqueIndex("agent_messages_slack_unique_idx").on(table.slackChannel, table.messageTs),
  ],
).enableRLS();

export const agentMessagesRelations = relations(agentMessages, ({ one }) => ({
  thread: one(agentThreads, {
    fields: [agentMessages.agentThreadId],
    references: [agentThreads.id],
  }),
}));

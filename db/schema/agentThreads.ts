import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { agentMessages } from "@/db/schema/agentMessages";
import { withTimestamps } from "../lib/with-timestamps";

export const agentThreads = pgTable(
  "agent_threads",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    slackChannel: text().notNull(),
    threadTs: text().notNull(),
  },
  (table) => [index("agent_threads_slack_channel_thread_ts_idx").on(table.slackChannel, table.threadTs)],
).enableRLS();

export const agentThreadsRelations = relations(agentThreads, ({ many }) => ({
  messages: many(agentMessages),
}));

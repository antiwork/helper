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
    mailboxId: bigint({ mode: "number" }).notNull(),
    slackChannel: text().notNull(),
    threadTs: text().notNull(),
  },
  (table) => {
    return {
      mailboxIdIdx: index("agent_threads_mailbox_id_idx").on(table.mailboxId),
      slackChannelThreadTsIdx: index("agent_threads_slack_channel_thread_ts_idx").on(
        table.slackChannel,
        table.threadTs,
      ),
    };
  },
);

export const agentThreadsRelations = relations(agentThreads, ({ one, many }) => ({
  mailbox: one(mailboxes, {
    fields: [agentThreads.mailboxId],
    references: [mailboxes.id],
  }),
  messages: many(agentMessages),
}));

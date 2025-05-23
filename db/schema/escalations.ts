import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const unused_escalations = pgTable(
  "conversations_escalation",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    slackMessageTs: text(),
    resolvedAt: timestamp({ withTimezone: true, mode: "date" }),
    conversationId: bigint({ mode: "number" }).notNull(),
    slackChannel: text(),
    summary: text(),
    clerkUserId: text(),
  },
  (table) => [
    index("conversatio_created_176a78_idx").on(table.createdAt),
    index("conversations_escalation_conversation_id_6a4dba67").on(table.conversationId),
  ],
).enableRLS();

export const escalationsRelations = relations(unused_escalations, ({ one }) => ({
  conversation: one(conversations, {
    fields: [unused_escalations.conversationId],
    references: [conversations.id],
  }),
}));

import { relations } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const conversationEvents = pgTable(
  "conversation_events",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    conversationId: bigint({ mode: "number" }).notNull(),
    type: text()
      .notNull()
      .default("update")
      .$type<
        | "update"
        | "request_human_support"
        | "reasoning_toggled"
        | "auto_closed_due_to_inactivity"
        | "email_auto_ignored"
      >(),
    changes: jsonb()
      .$type<{
        status?: "open" | "closed" | "spam";
        assignedToId?: string | null;
        assignedToAI?: boolean;
        isVisible?: boolean;
      }>()
      .notNull(),
    byUserId: text("by_clerk_user_id"),
    reason: text(),
  },
  (table) => [
    index("conversation_events_conversation_id_idx").on(table.conversationId),
    index("conversation_events_by_clerk_user_id_idx").on(table.byUserId),
    index("conversation_events_type_created_at_idx").on(table.type, table.createdAt),
  ],
).enableRLS();

export const conversationEventsRelations = relations(conversationEvents, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationEvents.conversationId],
    references: [conversations.id],
  }),
}));

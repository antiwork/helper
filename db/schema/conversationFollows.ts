import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, unique } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const conversationFollows = pgTable(
  "conversation_follows",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    userId: text("user_id").notNull(),
  },
  (table) => [
    index("conversation_follows_conversation_id_idx").on(table.conversationId),
    index("conversation_follows_user_id_idx").on(table.userId),
    unique("conversation_follows_conversation_user_unique").on(table.conversationId, table.userId),
  ],
).enableRLS();

export const conversationFollowsRelations = relations(conversationFollows, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationFollows.conversationId],
    references: [conversations.id],
  }),
}));
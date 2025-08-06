import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";
import { userProfiles } from "./userProfiles";

export const conversationFollows = pgTable(
  "conversation_follows",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    conversationId: bigint("conversation_id", { mode: "number" })
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => userProfiles.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("conversation_follows_conversation_id_idx").on(table.conversationId),
    index("conversation_follows_user_id_idx").on(table.userId),
    index("conversation_follows_created_at_idx").on(table.createdAt),
    index("conversation_follows_user_conversation_idx").on(table.userId, table.conversationId),
    unique("conversation_follows_conversation_user_unique").on(table.conversationId, table.userId),
  ],
).enableRLS();

export const conversationFollowsRelations = relations(conversationFollows, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationFollows.conversationId],
    references: [conversations.id],
  }),
  user: one(userProfiles, {
    fields: [conversationFollows.userId],
    references: [userProfiles.id],
  }),
}));
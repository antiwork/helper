import { relations } from "drizzle-orm";
import { bigint, index, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { authUsers } from "../supabaseSchema/auth";
import { conversations } from "./conversations";
import { userProfiles } from "./userProfiles";

export const conversationFollowers = pgTable(
  "conversation_followers",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    conversationId: bigint("conversation_id", { mode: "number" }).notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("conversation_followers_conversation_id_idx").on(table.conversationId),
    index("conversation_followers_user_id_idx").on(table.userId),
    unique("conversation_followers_conversation_user_unique").on(table.conversationId, table.userId),
  ],
).enableRLS();

export const conversationFollowersRelations = relations(conversationFollowers, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationFollowers.conversationId],
    references: [conversations.id],
  }),
  userProfile: one(userProfiles, {
    fields: [conversationFollowers.userId],
    references: [userProfiles.id],
  }),
  user: one(authUsers, {
    fields: [conversationFollowers.userId],
    references: [authUsers.id],
  }),
}));

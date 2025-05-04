import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text } from "drizzle-orm/pg-core";
import { files } from "@/db/schema/files";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";

export const notes = pgTable(
  "conversations_note",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    body: text().notNull(),
    clerkUserId: text(),
    role: text(),
    conversationId: bigint({ mode: "number" }).notNull(),
    slackMessageTs: text(),
    slackChannel: text(),
  },
  (table) => {
    return {
      createdAtIdx: index("conversatio_created_5ad461_idx").on(table.createdAt),
      conversationIdIdx: index("conversations_note_conversation_id_a486ed4c").on(table.conversationId),
      clerkUserIdIdx: index("conversations_note_clerk_user_id").on(table.clerkUserId),
    };
  },
);

export const notesRelations = relations(notes, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [notes.conversationId],
    references: [conversations.id],
  }),
  files: many(files),
}));

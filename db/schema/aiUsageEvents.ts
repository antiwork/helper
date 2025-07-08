import { relations } from "drizzle-orm";
import { bigint, index, integer, numeric, pgTable, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export const aiUsageEvents = pgTable(
  "mailboxes_aiusageevent",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    modelName: varchar().notNull(),
    queryType: varchar()
      .notNull()
      .$type<
        | "response_generator"
        | "conversation_summary"
        | "email_keywords_extractor"
        | "read_page_tool"
        | "chat_completion"
        | "reasoning"
        | "conversation_resolution"
        | "suggest_knowledge_bank_changes"
        | "suggest_knowledge_bank_from_reply"
        | "agent_response"
        | "auto_assign_conversation"
        | "email_auto_ignore"
        | "check_resolution"
        | "merge_similar_conversations"
      >(),
    inputTokensCount: integer().notNull(),
    outputTokensCount: integer().notNull(),
    cachedTokensCount: integer().notNull().default(0),
    cost: numeric({ precision: 12, scale: 7 }).notNull(),
    unused_mailboxId: bigint("mailbox_id", { mode: "number" }).$defaultFn(() => 0),
  },
  (table) => [
    index("mailboxes_aiusageevent_created_at_74823d57").on(table.createdAt.asc().nullsLast()),
    index("mailboxes_aiusageevent_mailbox_id_a4908f79").on(table.unused_mailboxId.asc().nullsLast()),
    index("mailboxes_aiusageevent_model_name_84b8ca7a").on(table.modelName.asc().nullsLast()),
    // Drizzle doesn't generate migrations with `text_pattern_ops`; they only have `text_ops`
    index("mailboxes_aiusageevent_model_name_84b8ca7a_like").on(table.modelName.asc().nullsLast()),
    index("mailboxes_aiusageevent_query_type_b4a486cb").on(table.queryType.asc().nullsLast()),
    // Drizzle doesn't generate migrations with `text_pattern_ops`; they only have `text_ops`
    index("mailboxes_aiusageevent_query_type_b4a486cb_like").on(table.queryType.asc().nullsLast()),
  ],
).enableRLS();

export const aiUsageEventsRelations = relations(aiUsageEvents, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [aiUsageEvents.unused_mailboxId],
    references: [mailboxes.id],
  }),
}));

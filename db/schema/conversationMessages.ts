import { and, eq, inArray, isNull, relations, sql } from "drizzle-orm";
import { bigint, boolean, index, jsonb, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { assertDefined } from "@/components/utils/assert";
import { PromptInfo } from "@/lib/ai/promptInfo";
import { CustomerInfo } from "@/types/customerInfo";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";
import { files } from "./files";
import { messageNotifications } from "./messageNotifications";

export type ToolMetadata = {
  tool: {
    id?: number;
    slug?: string;
    name: string;
    description: string;
    url: string;
    requestMethod?: string;
  };
  result: any;
  success: boolean;
  parameters: Record<string, unknown>;
};
export type MessageMetadata = Partial<CustomerInfo> &
  Record<string, unknown> & { reasoning?: string | null; includesScreenshot?: boolean };

type MessageStatus = "queueing" | "sent" | "failed" | "draft" | "discarded";
export type MessageRole = "user" | "staff" | "ai_assistant" | "tool";
type Metadata<T extends MessageRole> = T extends "tool" ? ToolMetadata : MessageMetadata;

export const DRAFT_STATUSES: Partial<MessageStatus>[] = ["draft", "discarded"];

export const conversationMessages = pgTable(
  "messages",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    conversationId: bigint({ mode: "number" }).notNull(),
    emailTo: varchar({ length: 65535 }),
    emailFrom: text(),
    emailCc: jsonb().$type<string[]>(),
    emailBcc: jsonb().$type<string[]>(),
    body: text("body"),
    cleanedUpText: text("cleaned_up_text"),
    role: text().notNull().$type<MessageRole>(),
    userId: text("clerk_user_id"),
    metadata: jsonb().$type<Metadata<MessageRole>>(),
    responseToId: bigint({ mode: "number" }),
    status: text().$type<MessageStatus>(),
    messageId: text(),
    references: text(),
    gmailMessageId: text(),
    gmailThreadId: text(),
    isPinned: boolean()
      .notNull()
      .$defaultFn(() => false),
    slackChannel: text(),
    slackMessageTs: text(),
    isPerfect: boolean().notNull(),

    isFlaggedAsBad: boolean().notNull(),
    promptInfo: jsonb().$type<{ details?: PromptInfo }>(),
    reason: varchar({ length: 65535 }),
    deletedAt: timestamp({ withTimezone: true }),
    searchIndex: text(),

    // For message reactions
    reactionType: text().$type<"thumbs-up" | "thumbs-down">(),
    reactionFeedback: text(),
    reactionCreatedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("conversatio_created_c4e0d1_idx").on(table.createdAt.asc().nullsLast()),
    index("conversations_email_conversation_id_391ad973").on(table.conversationId.asc().nullsLast()),
    index("conversations_email_gmail_message_id_3f6ee5ab").on(table.gmailMessageId.asc().nullsLast()),
    index("conversations_email_gmail_thread_id_68f031bf").on(table.gmailThreadId.asc().nullsLast()),
    index("conversations_email_is_pinned_ab83d24f").on(table.isPinned.asc().nullsLast()),
    index("conversations_email_message_id_a19e9ac9").on(table.messageId.asc().nullsLast()),
    index("conversations_email_response_to_id_af0048dc").on(table.responseToId.asc().nullsLast()),
    index("conversations_email_clerk_user_id").on(table.userId.asc().nullsLast()),
    index("search_index_idx").using("gin", sql`string_to_array(${table.searchIndex}, ' ') array_ops`),
    index("messages_reason_idx").using("btree", table.reason).concurrently(),
    index("messages_slack_message_ts_idx").using("btree", table.slackMessageTs).concurrently(),
    index("messages_reaction_count_idx")
      .on(table.reactionType, table.reactionCreatedAt)
      .where(isNull(table.deletedAt))
      .concurrently(),
    index("messages_role_created_at_idx").on(table.role, table.createdAt).concurrently(),
    index("messages_conversation_created_at_desc_idx")
      .on(table.conversationId, table.createdAt.desc())
      .where(assertDefined(and(isNull(table.deletedAt), inArray(table.role, ["user", "staff"])))),
    // Optimized composite index for "replied by" filter
    index("idx_messages_replied_by_filter")
      .on(table.conversationId, table.role, table.userId, table.createdAt)
      .where(assertDefined(and(isNull(table.deletedAt), eq(table.role, "staff"))))
      .concurrently(),
  ],
).enableRLS();

export const conversationMessageRelations = relations(conversationMessages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
  files: many(files),

  notifications: many(messageNotifications),
}));

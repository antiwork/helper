import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversationMessages } from "./conversationMessages";
import { conversations } from "./conversations";
import { platformCustomers } from "./platformCustomers";

export type NotificationStatus = "pending" | "sent" | "read" | "dismissed";

export const messageNotifications = pgTable(
  "message_notifications",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    messageId: bigint({ mode: "number" }).notNull(),
    conversationId: bigint({ mode: "number" }).notNull(),
    platformCustomerId: bigint({ mode: "number" }).notNull(),
    status: text().$type<NotificationStatus>().notNull().default("pending"),
    notificationText: text(),
    sentAt: timestamp({ withTimezone: true }),
    readAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("message_notifications_message_id_idx").on(table.messageId),
    index("message_notifications_conversation_id_idx").on(table.conversationId),
    index("message_notifications_platform_customer_id_idx").on(table.platformCustomerId),
    index("message_notifications_status_idx").on(table.status),
  ],
).enableRLS();

export const messageNotificationRelations = relations(messageNotifications, ({ one }) => ({
  message: one(conversationMessages, {
    fields: [messageNotifications.messageId],
    references: [conversationMessages.id],
  }),
  conversation: one(conversations, {
    fields: [messageNotifications.conversationId],
    references: [conversations.id],
  }),
  platformCustomer: one(platformCustomers, {
    fields: [messageNotifications.platformCustomerId],
    references: [platformCustomers.email],
  }),
}));

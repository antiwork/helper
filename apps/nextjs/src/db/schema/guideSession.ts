import { relations } from "drizzle-orm";
import { bigint, index, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { conversations } from "./conversations";
import { platformCustomers } from "./platformCustomers";

export const guideSessionStatusEnum = pgEnum("guide_session_status", [
  "started",
  "planning",
  "active",
  "completed",
  "abandoned",
  "paused",
]);

export type GuideSessionStep = {
  description: string;
  completed: boolean;
};

export const guideSessions = pgTable(
  "guide_sessions",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    uuid: uuid("uuid").notNull().defaultRandom(),
    platformCustomerId: bigint({ mode: "number" }),
    conversationId: bigint({ mode: "number" }),
    status: guideSessionStatusEnum("status").notNull().default("started"),
    title: text().notNull(),
    instructions: text(),
    steps: jsonb().default([]).$type<GuideSessionStep[]>(),
    metadata: jsonb().default({}),
    mailboxId: bigint({ mode: "number" }).notNull(),
  },
  (table) => [
    index("guide_sessions_created_at_idx").on(table.createdAt),
    index("guide_sessions_platform_customer_id_idx").on(table.platformCustomerId),
    index("guide_sessions_conversation_id_idx").on(table.conversationId),
    index("guide_sessions_mailbox_id_idx").on(table.mailboxId),
    index("guide_sessions_status_idx").on(table.status),
    unique("guide_sessions_uuid_unique").on(table.uuid),
  ],
);

export const guideSessionEventTypeEnum = pgEnum("guide_session_event_type", [
  "session_started",
  "status_changed",
  "step_added",
  "step_completed",
  "step_updated",
  "completed",
  "abandoned",
  "paused",
]);

export const guideSessionEvents = pgTable(
  "guide_session_events",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    guideSessionId: bigint({ mode: "number" }).notNull(),
    type: guideSessionEventTypeEnum("type").notNull(),
    data: jsonb().default({}),
    timestamp: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("guide_session_events_timestamp_idx").on(table.timestamp),
    index("guide_session_events_guide_session_id_idx").on(table.guideSessionId),
    index("guide_session_events_type_idx").on(table.type),
  ],
);

export const guideSessionReplays = pgTable(
  "guide_session_replays",
  {
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    guideSessionId: bigint({ mode: "number" }).notNull(),
    type: text().notNull(),
    data: text().notNull(),
    timestamp: timestamp({ withTimezone: true, mode: "date" }).notNull().defaultNow(),
    metadata: jsonb().default({}),
  },
  (table) => [
    index("guide_session_replays_guide_session_id_idx").on(table.guideSessionId),
    index("guide_session_replays_timestamp_idx").on(table.timestamp),
  ],
);

export const guideSessionsRelations = relations(guideSessions, ({ one, many }) => ({
  platformCustomer: one(platformCustomers, {
    fields: [guideSessions.platformCustomerId],
    references: [platformCustomers.id],
  }),
  conversation: one(conversations, {
    fields: [guideSessions.conversationId],
    references: [conversations.id],
  }),
  events: many(guideSessionEvents),
  replays: many(guideSessionReplays),
}));

export const guideSessionEventsRelations = relations(guideSessionEvents, ({ one }) => ({
  guideSession: one(guideSessions, {
    fields: [guideSessionEvents.guideSessionId],
    references: [guideSessions.id],
  }),
}));

export const guideSessionReplaysRelations = relations(guideSessionReplays, ({ one }) => ({
  guideSession: one(guideSessions, {
    fields: [guideSessionReplays.guideSessionId],
    references: [guideSessions.id],
  }),
}));

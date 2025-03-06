import { relations } from "drizzle-orm";
import { bigint, boolean, index, integer, jsonb, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { faqs } from "./faqs";
import { gmailSupportEmails } from "./gmailSupportEmails";
import { mailboxesMetadataApi } from "./mailboxesMetadataApi";
import { workflows } from "./workflows";

export const mailboxes = pgTable(
  "mailboxes_mailbox",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text().notNull(),
    slug: varchar({ length: 50 }).notNull(),
    responseGeneratorPrompt: jsonb().$type<string[]>(),
    clerkOrganizationId: text().notNull(),
    gmailSupportEmailId: bigint({ mode: "number" }),
    slackEscalationChannel: text(),
    slackBotToken: text(),
    slackBotUserId: text(),
    slackTeamId: text(),
    promptUpdatedAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
    escalationEmailBody: text(),
    escalationExpectedResolutionHours: integer(),
    ticketResponseAlertsEnabled: boolean().notNull().default(false),
    ticketResponseAlertsFrequency: text().$type<"hourly" | "daily" | "weekly">().notNull().default("hourly"),
    ticketResponseAlertsChannel: text(),
    widgetHMACSecret: varchar({ length: 255 }).notNull(),
    widgetDisplayMode: text().$type<"always" | "revenue_based" | "off">().notNull().default("off"),
    widgetDisplayMinValue: bigint({ mode: "number" }),
    autoRespondEmailToChat: boolean().notNull().default(false),
    widgetHost: text(),
    vipThreshold: bigint({ mode: "number" }),
    vipChannelId: text(),
    vipExpectedResponseHours: integer(),
    disableAutoResponseForVips: boolean().notNull().default(false),
  },
  (table) => {
    return {
      createdAtIdx: index("mailboxes_mailbox_created_at_5d4ea7d0").on(table.createdAt),
      clerkOrganizationIdIdx: index("mailboxes_mailbox_clerk_organization_id").on(table.clerkOrganizationId),
      slugUnique: unique("mailboxes_mailbox_slug_key").on(table.slug),
      gmailSupportEmailIdUnique: unique("mailboxes_mailbox_support_email_id_key").on(table.gmailSupportEmailId),
    };
  },
);

export const mailboxesRelations = relations(mailboxes, ({ one, many }) => ({
  mailboxesMetadataApi: one(mailboxesMetadataApi),
  gmailSupportEmail: one(gmailSupportEmails, {
    fields: [mailboxes.gmailSupportEmailId],
    references: [gmailSupportEmails.id],
  }),
  faqs: many(faqs),
  // Short relation name to avoid Postgres max identifier length
  // https://github.com/drizzle-team/drizzle-orm/issues/2066
  wfs: many(workflows),
}));

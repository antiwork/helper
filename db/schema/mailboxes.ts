import { relations } from "drizzle-orm";
import { bigint, boolean, index, integer, jsonb, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { faqs } from "./faqs";
import { gmailSupportEmails } from "./gmailSupportEmails";
import { mailboxesMetadataApi } from "./mailboxesMetadataApi";

type OnboardingMetadata = {
  completed: boolean;
};

export const mailboxes = pgTable(
  "mailboxes_mailbox",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    name: text().notNull(),
    slug: varchar({ length: 50 }).notNull(),
    unused_organizationId: text("clerk_organization_id")
      .notNull()
      .$default(() => ""),
    gmailSupportEmailId: bigint({ mode: "number" }),
    slackAlertChannel: text("slack_escalation_channel"),
    slackBotToken: text(),
    slackBotUserId: text(),
    slackTeamId: text(),
    githubInstallationId: text(),
    githubRepoOwner: text(),
    githubRepoName: text(),
    promptUpdatedAt: timestamp({ withTimezone: true, mode: "date" }).notNull(),
    widgetHMACSecret: varchar({ length: 255 }).notNull(),
    widgetDisplayMode: text().$type<"always" | "revenue_based" | "off">().notNull().default("always"),
    widgetDisplayMinValue: bigint({ mode: "number" }),
    widgetHost: text(),
    vipThreshold: bigint({ mode: "number" }),
    vipChannelId: text(),
    vipExpectedResponseHours: integer(),
    isWhitelabel: boolean().notNull().default(false),
    unused_onboardingMetadata: jsonb("onboarding_metadata").$type<OnboardingMetadata>().default({
      completed: false,
    }),
    autoCloseEnabled: boolean().notNull().default(false),
    autoCloseDaysOfInactivity: integer().notNull().default(14),
    unused_autoRespondEmailToChat: boolean("auto_respond_email_to_chat").notNull().default(false),
    unused_disableAutoResponseForVips: boolean("disable_auto_response_for_vips").notNull().default(false),
    unused_responseGeneratorPrompt: jsonb("response_generator_prompt").$type<string[]>(),
    unused_escalationEmailBody: text("escalation_email_body"),
    unused_escalationExpectedResolutionHours: integer("escalation_expected_resolution_hours"),
    preferences: jsonb()
      .$type<{
        confetti?: boolean;
        theme?: {
          background: string;
          foreground: string;
          primary: string;
          accent: string;
          sidebarBackground: string;
        } | null;
        autoRespondEmailToChat?: "draft" | "reply" | null;
        disableTicketResponseTimeAlerts?: boolean;
      }>()
      .default({}),
  },
  (table) => [
    index("mailboxes_mailbox_created_at_5d4ea7d0").on(table.createdAt),
    index("mailboxes_mailbox_clerk_organization_id").on(table.unused_organizationId),
    unique("mailboxes_mailbox_slug_key").on(table.slug),
    unique("mailboxes_mailbox_support_email_id_key").on(table.gmailSupportEmailId),
  ],
).enableRLS();

export const mailboxesRelations = relations(mailboxes, ({ one, many }) => ({
  mailboxesMetadataApi: one(mailboxesMetadataApi),
  gmailSupportEmail: one(gmailSupportEmails, {
    fields: [mailboxes.gmailSupportEmailId],
    references: [gmailSupportEmails.id],
  }),
  faqs: many(faqs),
}));

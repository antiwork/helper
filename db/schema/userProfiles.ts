import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "../supabaseSchema/auth";

export type AccessRole = "afk" | "core" | "nonCore";

// Created automatically when a user is inserted via a Postgres trigger. See db/drizzle/0101_complete_wraith.sql
export const userProfiles = pgTable("user_profiles", {
  id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text().default(""),
  permissions: text().notNull().default("member"), // "member" or "admin"
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date()),
  access: jsonb("access")
    .$type<{
      role: AccessRole;
      keywords: string[];
    }>()
    .default({ role: "afk", keywords: [] }),
  pinnedIssueGroupIds: jsonb("pinned_issue_group_ids").$type<number[]>().default([]),
  preferences: jsonb().$type<{
    confetti?: boolean;
    disableNextTicketPreview?: boolean;
    autoAssignOnReply?: boolean;
  }>(),
}).enableRLS();

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(authUsers, {
    fields: [userProfiles.id],
    references: [authUsers.id],
  }),
}));

export type BasicUserProfile = { id: string; displayName: string | null; email: string | null };
export type FullUserProfile = typeof userProfiles.$inferSelect & { email: string | null };

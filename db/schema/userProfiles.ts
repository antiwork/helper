import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "../supabaseSchema/auth";

export type AccessRole = "afk" | "core" | "nonCore";

// Created automatically when a user is inserted via a Postgres trigger. See db/drizzle/0101_little_arclight.sql
export const userProfiles = pgTable("user_profiles", {
  id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  email: text().notNull(),
  displayName: text().default(""),
  permissions: text().notNull().default("member"), // "member" or "admin"
  lastMailboxSlug: text("last_mailbox_slug"),
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
}).enableRLS();

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(authUsers, {
    fields: [userProfiles.id],
    references: [authUsers.id],
  }),
}));

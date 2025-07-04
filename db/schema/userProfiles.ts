import { relations } from "drizzle-orm";
import {  pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "../supabaseSchema/auth";
import { userMailboxAccess } from "./userMailboxAccess";

// Created automatically when a user is inserted via a Postgres trigger. See db/drizzle/0101_little_arclight.sql
export const userProfiles = pgTable("user_profiles", {
  id: uuid()
    .primaryKey()
    .references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text().default(""),
  permissions: text().notNull().default("member"), // "member" or "admin"
  inviterUserId: uuid().references(() => authUsers.id).default(""),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp()
    .defaultNow()
    .$onUpdate(() => new Date()),
}).enableRLS();

export const userProfilesRelations = relations(userProfiles, ({ one, many }) => ({
  user: one(authUsers, {
    fields: [userProfiles.id],
    references: [authUsers.id],
  }),
  mailboxAccess: many(userMailboxAccess),
}));

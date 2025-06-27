import { pgTable, text, uuid, timestamp, jsonb } from "drizzle-orm/pg-core";
import { authUsers } from "../supabaseSchema/auth";
import { relations } from "drizzle-orm";

export type AccessRole = "afk" | "core" | "nonCore";

export const userProfiles = pgTable("user_profiles", {
  id: uuid().primaryKey().references(() => authUsers.id, { onDelete: "cascade" }),
  displayName: text().default(""),
  permissions: text().notNull().default("member"), // "member" or "admin"
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow().$onUpdate(() => new Date()),
  access: jsonb("access").$type<{
    role: AccessRole;
    keywords: string[];
  }>().default({ role: "afk", keywords: [] }),
}).enableRLS();

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(authUsers, {
    fields: [userProfiles.id],
    references: [authUsers.id],
  }),
}));

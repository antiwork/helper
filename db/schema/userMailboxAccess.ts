import { relations } from "drizzle-orm";
import {  pgTable, bigint, text, timestamp, uuid, unique } from "drizzle-orm/pg-core";
import { userProfiles } from "./userProfiles";
import { mailboxes } from "./mailboxes";

export type AccessRole = "afk" | "core" | "nonCore";

export const userMailboxAccess = pgTable("user_mailbox_access", {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().references(() => userProfiles.id, { onDelete: "cascade" }),
  mailboxId: bigint({ mode: "number" }).references(() => mailboxes.id, { onDelete: "cascade" }),
  role: text().$type<AccessRole>().notNull(),
  keywords: text().array().default([]),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
    unique().on(table.userId, table.mailboxId)
]);

export const userMailboxAccessRelations = relations(userMailboxAccess, ({ one }) => ({
    user: one(userProfiles, {
      fields: [userMailboxAccess.userId],
      references: [userProfiles.id],
    }),
    mailbox: one(mailboxes, {
      fields: [userMailboxAccess.mailboxId],
      references: [mailboxes.id],
    }),
  }));
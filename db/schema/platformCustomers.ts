import { relations, sql } from "drizzle-orm";
import { bigint, index, jsonb, numeric, pgTable, unique, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export const platformCustomers = pgTable(
  "mailboxes_platformcustomer",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    mailboxId: bigint({ mode: "number" }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    name: varchar(),
    value: numeric({ precision: 12, scale: 2 }),
    links: jsonb().$type<Record<string, string>>(),
  },
  (table) => {
    return {
      createdAtIdx: index("mailboxes_platformcustomer_created_at_73183c2a").on(table.createdAt),
      mailboxIdIdx: index("mailboxes_platformcustomer_mailbox_id_58ea76bf").on(table.mailboxId),
      emailUnique: unique("mailboxes_platformcustomer_email_key").on(table.email),
      emailIlike: index("mailboxes_platformcustomer_email_ilike")
        .using("gin", sql`${table.email} gin_trgm_ops`)
        .concurrently(),
    };
  },
);

export const platformCustomersRelations = relations(platformCustomers, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [platformCustomers.mailboxId],
    references: [mailboxes.id],
  }),
}));

import { relations, sql } from "drizzle-orm";
import { bigint, index, jsonb, numeric, pgTable, unique, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export const platformCustomers = pgTable(
  "mailboxes_platformcustomer",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    email: varchar({ length: 255 }).notNull(),
    name: varchar(),
    value: numeric({ precision: 12, scale: 2 }),
    links: jsonb().$type<Record<string, string>>(),
  },
  (table) => [
    index("mailboxes_platformcustomer_created_at_73183c2a").on(table.createdAt),
    index("mailboxes_platformcustomer_email_ilike")
      .using("gin", sql`${table.email} gin_trgm_ops`)
      .concurrently(),
  ],
).enableRLS();

export const platformCustomersRelations = relations(platformCustomers, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [platformCustomers.id],
    references: [mailboxes.id],
  }),
}));

import { relations, sql } from "drizzle-orm";
import { bigint, index, jsonb, numeric, pgTable, unique, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export const platformCustomers = pgTable(
  "mailboxes_platformcustomer",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    unused_mailboxId: bigint("mailbox_id", { mode: "number" })
      .notNull()
      .$defaultFn(() => 0),
    email: varchar({ length: 255 }).notNull(),
    name: varchar(),
    value: numeric({ precision: 12, scale: 2 }),
    links: jsonb().$type<Record<string, string>>(),
    metadata: jsonb().$type<Record<string, unknown>>(),
  },
  (table) => [
    index("mailboxes_platformcustomer_created_at_73183c2a").on(table.createdAt),
    index("mailboxes_platformcustomer_mailbox_id_58ea76bf").on(table.unused_mailboxId),
    unique("mailboxes_platformcustomer_email_key").on(table.email),
    index("platformcustomer_value_idx").on(table.value.desc().nullsLast()),
    index("mailboxes_platformcustomer_email_ilike")
      .using("gin", sql`${table.email} gin_trgm_ops`)
      .concurrently(),
  ],
).enableRLS();

export const platformCustomersRelations = relations(platformCustomers, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [platformCustomers.unused_mailboxId],
    references: [mailboxes.id],
  }),
}));

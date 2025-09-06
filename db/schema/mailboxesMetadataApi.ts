import { relations } from "drizzle-orm";
import { bigint, boolean, index, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { mailboxes } from "@/db/schema/mailboxes";
import { withTimestamps } from "../lib/with-timestamps";

export const unused_mailboxesMetadataApi = pgTable(
  "mailboxes_metadataapi",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    url: text().notNull(),
    hmacSecret: text().notNull(),
    isEnabled: boolean().notNull(),
    unused_mailboxId: bigint("mailbox_id", { mode: "number" })
      .notNull()
      .$defaultFn(() => 0),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (table) => [
    index("mailboxes_metadataapi_created_at_1ee2d2c2").on(table.createdAt),
    unique("mailboxes_metadataapi_mailbox_id_key").on(table.unused_mailboxId),
  ],
).enableRLS();

export const mailboxesMetadataApiRelations = relations(unused_mailboxesMetadataApi, ({ one }) => ({
  mailbox: one(mailboxes, {
    fields: [unused_mailboxesMetadataApi.unused_mailboxId],
    references: [mailboxes.id],
  }),
}));

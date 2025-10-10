import { relations } from "drizzle-orm";
import { bigint, index, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export const customerNotes = pgTable(
  "customer_notes",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    email: varchar({ length: 255 }).notNull(),
    body: text().notNull(),
    userId: text("clerk_user_id").notNull(),
  },
  (table) => [
    index("customer_notes_email_idx").on(table.email),
    index("customer_notes_created_at_idx").on(table.createdAt),
    index("customer_notes_user_id_idx").on(table.userId),
  ],
).enableRLS();

export const customerNotesRelations = relations(customerNotes, () => ({}));

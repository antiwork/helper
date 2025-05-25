import { relations } from "drizzle-orm";
import { bigint, index, integer, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { encryptedField, nativeEncryptedField } from "@/db/lib/encryptedField";
import { mailboxes } from "@/db/schema/mailboxes";
import { withTimestamps } from "../lib/with-timestamps";

export const gmailSupportEmails = pgTable(
  "mailboxes_gmailsupportemail",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    email: varchar({ length: 254 }).notNull(),
    expiresAt: timestamp({ withTimezone: true, mode: "date" }),
    historyId: integer(),
    accessToken: encryptedField(),
    encryptedAccessToken: nativeEncryptedField("encrypted_access_token"),
    refreshToken: encryptedField(),
    encryptedRefreshToken: nativeEncryptedField("encrypted_refresh_token"),
    clerkUserId: text(),
  },
  (table) => {
    return {
      createdAtIdx: index("mailboxes_gmailsupportemail_created_at_321a00f1").on(table.createdAt),
      // Drizzle doesn't generate migrations with `text_pattern_ops`; they only have `text_ops`
      emailIdxLike: index("mailboxes_supportemail_email_99536dd8_like").on(table.email),
      emailUnique: unique("mailboxes_supportemail_email_key").on(table.email),
    };
  },
);

export const gmailSupportEmailsRelations = relations(gmailSupportEmails, ({ many }) => ({
  mailboxes: many(mailboxes),
}));

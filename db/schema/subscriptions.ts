import { bigint, index, pgTable, text, timestamp, unique, varchar } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export const subscriptions = pgTable(
  "mailboxes_subscription",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    stripeSubscriptionId: varchar(),
    stripeCustomerId: varchar(),
    currentPeriodEnd: timestamp({ withTimezone: true, mode: "date" }),
    status: varchar(),
    clerkOrganizationId: text().notNull(),
    canceledAt: timestamp({ withTimezone: true, mode: "date" }),
  },
  (table) => {
    return {
      createdAtIdx: index("mailboxes_subscription_created_at_2852d657").on(table.createdAt),
      clerkOrganizationIdUnique: unique("mailboxes_subscription_clerk_organization_id").on(table.clerkOrganizationId),
    };
  },
);

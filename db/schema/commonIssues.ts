import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "@/db/schema/mailboxes";
import { randomSlugField } from "../lib/random-slug-field";


export const commonIssues = pgTable(
    "common_issues", 
    {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    slug: randomSlugField("slug"),
    title: text('title'),
    keywords: text('keywords').array(),
    createdByUserId: text('created_by_user_id'),
    mailboxId: bigint({ mode: 'number' })
        .notNull()
        .references(() => mailboxes.id, { onDelete: 'cascade' }),
    }
)
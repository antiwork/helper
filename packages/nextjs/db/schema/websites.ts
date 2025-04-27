import { relations } from "drizzle-orm";
import { bigint, index, jsonb, pgTable, text, timestamp, varchar, vector } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";
import { mailboxes } from "./mailboxes";

export interface CrawlMetadata {
  crawlIdentifier?: string;
  firecrawlJobId?: string;
  webhookSecret?: string;
  pageCount?: number;
  creditsUsed?: number;
}

export const websites = pgTable(
  "website_docs",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    mailboxId: bigint({ mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    url: text("url").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => {
    return {
      createdAtIdx: index("websites_created_at_idx").on(table.createdAt),
      mailboxIdIdx: index("websites_mailbox_id_idx").on(table.mailboxId),
      urlIdx: index("websites_url_idx").on(table.url),
    };
  },
);

export const websitePages = pgTable(
  "website_docs_pages",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    websiteId: bigint({ mode: "number" }).notNull(),
    websiteCrawlId: bigint({ mode: "number" }).notNull(),
    url: text("url").notNull(),
    rawHtml: text("raw_html").notNull(),
    markdown: text("markdown").notNull(),
    pageTitle: text("page_title").notNull(),
    metadata: jsonb("metadata"),
    embedding: vector({ dimensions: 1536 }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => {
    return {
      createdAtIdx: index("website_pages_created_at_idx").on(table.createdAt),
      websiteIdIdx: index("website_pages_website_id_idx").on(table.websiteId),
      websiteCrawlIdIdx: index("website_pages_website_crawl_id_idx").on(table.websiteCrawlId),
      urlIdx: index("website_pages_url_idx").on(table.url),
      pageEmbeddingIdx: index("website_pages_embedding_index").using(
        "hnsw",
        table.embedding.asc().nullsLast().op("vector_cosine_ops"),
      ),
    };
  },
);

export const websiteCrawls = pgTable(
  "website_docs_crawls",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    websiteId: bigint({ mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    status: varchar("status", { length: 50 }).notNull(),
    metadata: jsonb("metadata").$type<CrawlMetadata>(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => {
    return {
      createdAtIdx: index("website_crawls_created_at_idx").on(table.createdAt),
      websiteIdIdx: index("website_crawls_website_id_idx").on(table.websiteId),
      statusIdx: index("website_crawls_status_idx").on(table.status),
    };
  },
);

export const websitesRelations = relations(websites, ({ one, many }) => ({
  mailbox: one(mailboxes, {
    fields: [websites.mailboxId],
    references: [mailboxes.id],
  }),
  pages: many(websitePages),
  crawls: many(websiteCrawls),
}));

export const websitePagesRelations = relations(websitePages, ({ one }) => ({
  website: one(websites, {
    fields: [websitePages.websiteId],
    references: [websites.id],
  }),
  crawl: one(websiteCrawls, {
    fields: [websitePages.websiteCrawlId],
    references: [websiteCrawls.id],
  }),
}));

export const websiteCrawlsRelations = relations(websiteCrawls, ({ one }) => ({
  website: one(websites, {
    fields: [websiteCrawls.websiteId],
    references: [websites.id],
  }),
}));

ALTER TABLE "messages" ADD COLUMN "search_index" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "search_index_idx" ON "messages" USING gin (string_to_array("search_index", ' ') array_ops);
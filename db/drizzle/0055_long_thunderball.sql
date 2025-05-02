ALTER TABLE "conversation_events" ADD COLUMN "type" text DEFAULT 'update' NOT NULL;--> statement-breakpoint
CREATE INDEX "conversation_events_type_created_at_idx" ON "conversation_events" USING btree ("type","created_at");

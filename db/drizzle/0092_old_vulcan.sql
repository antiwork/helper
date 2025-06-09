COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "messages_role_created_at_idx" ON "messages" USING btree ("role","created_at");
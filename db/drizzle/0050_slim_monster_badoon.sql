COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "messages_reaction_count_idx" ON "messages" USING btree ("reaction_type","reaction_created_at") WHERE "messages"."deleted_at" is null;
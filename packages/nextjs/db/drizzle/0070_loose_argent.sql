COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "conversations_mailbox_assigned_to_status_id_idx" ON "conversations_conversation" USING btree ("mailbox_id","status","assigned_to_id");

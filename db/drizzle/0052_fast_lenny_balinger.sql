ALTER TABLE "conversations_file" ADD COLUMN "note_id" bigint;--> statement-breakpoint
CREATE INDEX "conversations_file_note_id_idx" ON "conversations_file" USING btree ("note_id");
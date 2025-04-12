ALTER TABLE "guide_session_events" ADD COLUMN "mailbox_id" bigint NOT NULL;--> statement-breakpoint
ALTER TABLE "guide_session_replays" ADD COLUMN "mailbox_id" bigint NOT NULL;--> statement-breakpoint
CREATE INDEX "guide_session_events_mailbox_id_idx" ON "guide_session_events" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "guide_session_replays_mailbox_id_idx" ON "guide_session_replays" USING btree ("mailbox_id");
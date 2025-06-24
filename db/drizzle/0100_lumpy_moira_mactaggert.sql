ALTER TABLE "issue_topics" ADD COLUMN "mailbox_id" bigint NOT NULL;--> statement-breakpoint
CREATE INDEX "issue_topics_mailbox_id_idx" ON "issue_topics" USING btree ("mailbox_id");
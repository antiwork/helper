ALTER TABLE "guide_sessions" ALTER COLUMN "platform_customer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "guide_sessions" ADD COLUMN "mailbox_id" bigint NOT NULL;--> statement-breakpoint
CREATE INDEX "guide_sessions_mailbox_id_idx" ON "guide_sessions" USING btree ("mailbox_id");
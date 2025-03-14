ALTER TABLE "mailboxes_mailbox" ALTER COLUMN "auto_close_days_of_inactivity" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_metadataapi" ADD COLUMN "auto_close_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_metadataapi" ADD COLUMN "auto_close_days_of_inactivity" integer DEFAULT 14 NOT NULL;
ALTER TABLE "mailboxes_mailbox" ADD COLUMN "customer_info_url" text;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ADD COLUMN "customer_specific_info_url" boolean DEFAULT false;
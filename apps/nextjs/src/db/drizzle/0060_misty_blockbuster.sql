ALTER TABLE "mailboxes_mailbox" ADD COLUMN "ticket_response_alerts_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ADD COLUMN "ticket_response_alerts_frequency" text DEFAULT 'hourly' NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ADD COLUMN "ticket_response_alerts_channel" text;
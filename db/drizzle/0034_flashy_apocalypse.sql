ALTER TABLE "mailboxes_mailbox" ADD COLUMN "widget_display_mode" text DEFAULT 'off' NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ADD COLUMN "widget_display_min_value" bigint;
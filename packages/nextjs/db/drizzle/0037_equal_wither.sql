ALTER TABLE "mailboxes_mailbox" ADD COLUMN "auto_respond_email_to_chat" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ADD COLUMN "widget_host" text;
ALTER TABLE "messages" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "cleaned_up_text" text;--> statement-breakpoint
ALTER TABLE "conversations_conversation" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "refresh_token" text;
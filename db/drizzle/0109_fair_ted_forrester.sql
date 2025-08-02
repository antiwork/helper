ALTER TABLE "tool_apis" ALTER COLUMN "authentication_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "tools" ALTER COLUMN "authentication_token" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "body" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "cleaned_up_text" text;--> statement-breakpoint
ALTER TABLE "conversations_conversation" ADD COLUMN "subject" text;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "access_token" text;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "refresh_token" text;--> statement-breakpoint
ALTER TABLE "tool_apis" ADD COLUMN "encrypted_authentication_token" "bytea";--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "encrypted_authentication_token" "bytea";
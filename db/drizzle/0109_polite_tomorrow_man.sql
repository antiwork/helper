ALTER TABLE "messages" ADD COLUMN "body_plaintext" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "cleaned_up_text_plaintext" text;--> statement-breakpoint
ALTER TABLE "conversations_conversation" ADD COLUMN "subject_plaintext" text;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "access_token_plaintext" text;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "refresh_token_plaintext" text;--> statement-breakpoint
ALTER TABLE "tool_apis" ADD COLUMN "authentication_token_plaintext" text;--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "authentication_token_plaintext" text;
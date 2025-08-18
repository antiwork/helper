ALTER TABLE "messages" DROP COLUMN "encrypted_body";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "encrypted_cleaned_up_text";--> statement-breakpoint
ALTER TABLE "conversations_conversation" DROP COLUMN "encrypted_subject";--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" DROP COLUMN "encrypted_access_token";--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" DROP COLUMN "encrypted_refresh_token";--> statement-breakpoint
ALTER TABLE "tool_apis" DROP COLUMN "encrypted_authentication_token";--> statement-breakpoint
ALTER TABLE "tools" DROP COLUMN "encrypted_authentication_token";
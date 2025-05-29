ALTER TABLE "messages" ADD COLUMN "encrypted_body" "bytea";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "encrypted_cleaned_up_text" "bytea";--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "encrypted_access_token" "bytea";--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "encrypted_refresh_token" "bytea";
ALTER TABLE "mailboxes_gmailsupportemail" ALTER COLUMN "access_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ALTER COLUMN "refresh_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_userprofile" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "conversations_conversation" ADD COLUMN "assigned_to_clerk_id" text;--> statement-breakpoint
ALTER TABLE "conversations_escalation" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "mailboxes_userprofile" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
ALTER TABLE "conversations_note" ADD COLUMN "clerk_user_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_email_clerk_user_id" ON "messages" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_conversation_assigned_to_clerk_id" ON "conversations_conversation" USING btree ("assigned_to_clerk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_note_clerk_user_id" ON "conversations_note" USING btree ("clerk_user_id");--> statement-breakpoint
ALTER TABLE "mailboxes_userprofile" ADD CONSTRAINT "mailboxes_userprofile_clerk_user_id_key" UNIQUE("clerk_user_id");
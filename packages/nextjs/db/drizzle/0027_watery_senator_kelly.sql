ALTER TABLE "conversations_email" RENAME TO "messages";--> statement-breakpoint
ALTER TABLE "conversations_file" RENAME COLUMN "email_id" TO "message_id";--> statement-breakpoint
ALTER TABLE "mailboxes_pinnedreply" RENAME COLUMN "email_id" TO "message_id";--> statement-breakpoint
ALTER TABLE "workflows_workflowrun" RENAME COLUMN "email_id" TO "message_id";--> statement-breakpoint
ALTER TABLE "mailboxes_pinnedreply" DROP CONSTRAINT "mailboxes_pinnedreply_email_id_key";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_file_email_id_686bb83a";--> statement-breakpoint
DROP INDEX IF EXISTS "workflows_workflowrun_email_id_8a2979e0";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "conversations_file_message_id_idx" ON "conversations_file" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "workflows_workflowrun_message_id_idx" ON "workflows_workflowrun" USING btree ("message_id");--> statement-breakpoint
ALTER TABLE "mailboxes_pinnedreply" ADD CONSTRAINT "mailboxes_pinnedreply_message_id_key" UNIQUE("message_id");
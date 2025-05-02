ALTER TABLE "conversations_file" DROP CONSTRAINT "conversations_file_email_id_686bb83a_fk_conversations_email_id";
--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_file_slug_9b94ee8f_like";
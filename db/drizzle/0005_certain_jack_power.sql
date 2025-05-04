ALTER TABLE "conversations_email" DROP CONSTRAINT "conversations_email_conversation_id_391ad973_fk_conversat";
--> statement-breakpoint
ALTER TABLE "conversations_email" DROP CONSTRAINT "conversations_email_response_to_id_af0048dc_fk_conversat";
--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_email_gmail_message_id_3f6ee5ab_like";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_email_gmail_thread_id_68f031bf_like";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_email_message_id_a19e9ac9_like";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_email_skipped_generating_response_at_bc702570";--> statement-breakpoint
ALTER TABLE "conversations_email" DROP COLUMN IF EXISTS "skipped_generating_response_at";--> statement-breakpoint
ALTER TABLE "conversations_email" DROP COLUMN IF EXISTS "button_action";--> statement-breakpoint
ALTER TABLE "conversations_email" DROP COLUMN IF EXISTS "notes";--> statement-breakpoint
ALTER TABLE "conversations_email" DROP COLUMN IF EXISTS "generated_api_request";--> statement-breakpoint
ALTER TABLE "conversations_email" DROP COLUMN IF EXISTS "api_request_run";
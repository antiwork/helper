ALTER TABLE "conversations_conversation" DROP CONSTRAINT "conversations_conver_assigned_to_id_327a1b36_fk_auth_user";
--> statement-breakpoint
ALTER TABLE "conversations_conversation" DROP CONSTRAINT "conversations_conver_mailbox_id_7fb25662_fk_mailboxes";
--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_conversation_external_conversation_id_ad4f1283";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_conversation_external_customer_id_2c2eb6a2";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_conversation_status_c5b08f82_like";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_conversation_subject_8c64da29_like";--> statement-breakpoint
ALTER TABLE "conversations_conversation" DROP COLUMN IF EXISTS "external_conversation_id";--> statement-breakpoint
ALTER TABLE "conversations_conversation" DROP COLUMN IF EXISTS "external_customer_id";
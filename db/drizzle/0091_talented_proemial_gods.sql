DROP TABLE "conversations_escalation" CASCADE;--> statement-breakpoint
DROP TABLE "mailboxes_subscription" CASCADE;--> statement-breakpoint
DROP INDEX "conversations_conversation_assigned_to_id_327a1b36";--> statement-breakpoint
DROP INDEX "conversations_mailbox_assigned_to_status_id_idx";--> statement-breakpoint
DROP INDEX "mailboxes_mailbox_clerk_organization_id";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "body";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "cleaned_up_text";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "docs_context";--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN "past_replies_context";--> statement-breakpoint
ALTER TABLE "conversations_conversation" DROP COLUMN "assigned_to_id";--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" DROP COLUMN "access_token";--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" DROP COLUMN "refresh_token";--> statement-breakpoint
ALTER TABLE "mailboxes_gmailsupportemail" DROP COLUMN "clerk_user_id";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN "clerk_organization_id";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN "auto_respond_email_to_chat";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN "onboarding_metadata";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN "disable_auto_response_for_vips";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN "response_generator_prompt";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN "escalation_email_body";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN "escalation_expected_resolution_hours";
ALTER TABLE "mailboxes_subscription" DROP CONSTRAINT "mailboxes_subscription_organization_id_key";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_email_user_id_c1318366";--> statement-breakpoint
DROP INDEX IF EXISTS "mailboxes_mailbox_organization_id_ad570054";--> statement-breakpoint
DROP INDEX IF EXISTS "mailboxes_stylelinter_organization_id_bd0f87bd";--> statement-breakpoint
DROP INDEX IF EXISTS "conversations_note_user_id_bb7dbd33";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ALTER COLUMN "clerk_organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_subscription" ALTER COLUMN "clerk_organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_stylelinter" ALTER COLUMN "clerk_organization_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "conversations_escalation" DROP COLUMN IF EXISTS "user_id";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
ALTER TABLE "mailboxes_subscription" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
ALTER TABLE "mailboxes_stylelinter" DROP COLUMN IF EXISTS "organization_id";--> statement-breakpoint
ALTER TABLE "conversations_note" DROP COLUMN IF EXISTS "user_id";
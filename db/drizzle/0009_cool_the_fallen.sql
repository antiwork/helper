ALTER TABLE "mailboxes_mailbox" DROP CONSTRAINT "mailboxes_mailbox_custom_email_address_key";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP CONSTRAINT "mailboxes_mailbox_gmail_support_email__3447a558_fk_mailboxes";
--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP CONSTRAINT "mailboxes_mailbox_organization_id_ad570054_fk_mailboxes";
--> statement-breakpoint
DROP INDEX IF EXISTS "mailboxes_mailbox_custom_email_address_3affd502_like";--> statement-breakpoint
DROP INDEX IF EXISTS "mailboxes_mailbox_slug_11625ddd_like";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "custom_email_address";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_webhook_url";
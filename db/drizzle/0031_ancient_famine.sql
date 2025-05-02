ALTER TABLE "mailboxes_mailbox" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_stylelinter" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" ADD COLUMN "clerk_organization_id" text;--> statement-breakpoint
ALTER TABLE "mailboxes_subscription" ADD COLUMN "clerk_organization_id" text;--> statement-breakpoint
ALTER TABLE "mailboxes_stylelinter" ADD COLUMN "clerk_organization_id" text;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mailboxes_mailbox_clerk_organization_id" ON "mailboxes_mailbox" USING btree ("clerk_organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mailboxes_stylelinter_clerk_organization_id" ON "mailboxes_stylelinter" USING btree ("clerk_organization_id");--> statement-breakpoint
ALTER TABLE "mailboxes_subscription" ADD CONSTRAINT "mailboxes_subscription_clerk_organization_id" UNIQUE("clerk_organization_id");
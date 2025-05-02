ALTER TABLE "mailboxes_mailbox" ADD COLUMN "onboarding_metadata" jsonb DEFAULT '{"completed":false}'::jsonb;
UPDATE "mailboxes_mailbox" SET "onboarding_metadata" = '{"completed":true}'::jsonb;

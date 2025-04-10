ALTER TABLE "mailboxes_mailbox" ALTER COLUMN "preferences" SET DEFAULT '{"confetti":false}'::jsonb;
--> statement-breakpoint

-- Update existing rows to have the default value
UPDATE "mailboxes_mailbox" 
SET "preferences" = '{"confetti":false}'::jsonb 
WHERE "preferences" IS NULL;

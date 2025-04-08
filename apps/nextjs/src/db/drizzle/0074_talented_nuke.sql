ALTER TABLE "mailboxes_mailbox" ADD COLUMN "preferences" jsonb DEFAULT '{"confetti":false,"confettiEvents":["reply","close"],"confettiIntensity":"medium"}'::jsonb;

-- Update existing rows to have the default value
UPDATE "mailboxes_mailbox" 
SET "preferences" = '{"confetti":false,"confettiEvents":["reply","close"],"confettiIntensity":"medium"}'::jsonb 
WHERE "preferences" IS NULL;
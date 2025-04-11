ALTER TABLE "mailboxes_mailbox" ADD COLUMN "preferences" jsonb DEFAULT '{"confetti":false}'::jsonb;

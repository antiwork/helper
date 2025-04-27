ALTER TABLE "mailboxes_pinnedreply" RENAME COLUMN "subject" TO "question";--> statement-breakpoint
ALTER TABLE "mailboxes_pinnedreply" ALTER COLUMN "question" SET NOT NULL;
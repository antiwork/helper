COMMIT;--> statement-breakpoint
-- This eliminates sequential scans for the main dashboard view when the dataset grows
CREATE INDEX CONCURRENTLY IF NOT EXISTS conversations_mailbox_status_ordering_idx 
ON conversations_conversation (mailbox_id, status, last_user_email_created_at DESC NULLS LAST) 
WHERE merged_into_id IS NULL;

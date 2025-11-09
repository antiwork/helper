-- Remove Slack-related columns and indexes

-- Drop indexes first
DROP INDEX IF EXISTS "messages_slack_message_ts_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "agent_threads_slack_channel_thread_ts_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "agent_messages_slack_unique_idx";--> statement-breakpoint

-- Remove columns from mailboxes table
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_escalation_channel";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_bot_token";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_bot_user_id";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_team_id";--> statement-breakpoint
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "vip_channel_id";--> statement-breakpoint

-- Remove columns from conversation_messages table
ALTER TABLE "conversations_email" DROP COLUMN IF EXISTS "slack_channel";--> statement-breakpoint
ALTER TABLE "conversations_email" DROP COLUMN IF EXISTS "slack_message_ts";--> statement-breakpoint

-- Remove columns from notes table
ALTER TABLE "conversations_note" DROP COLUMN IF EXISTS "slack_message_ts";--> statement-breakpoint
ALTER TABLE "conversations_note" DROP COLUMN IF EXISTS "slack_channel";--> statement-breakpoint

-- Remove columns from faqs table
ALTER TABLE "faqs" DROP COLUMN IF EXISTS "slack_channel";--> statement-breakpoint
ALTER TABLE "faqs" DROP COLUMN IF EXISTS "slack_message_ts";--> statement-breakpoint

-- Remove columns from agent_threads table
ALTER TABLE "agent_threads" DROP COLUMN IF EXISTS "slack_channel";--> statement-breakpoint

-- Remove columns from agent_messages table
ALTER TABLE "agent_messages" DROP COLUMN IF EXISTS "slack_channel";--> statement-breakpoint


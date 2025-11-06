-- Migration: Remove Slack integration fields and tables
-- This migration removes all Slack-related columns and tables as part of the migration to email notifications

-- Drop indexes on Slack fields before dropping columns
DROP INDEX IF EXISTS "messages_slack_message_ts_idx";
DROP INDEX IF EXISTS "agent_threads_slack_channel_thread_ts_idx";
DROP INDEX IF EXISTS "agent_messages_slack_unique_idx";

-- Drop agent tables (Slack-specific functionality)
DROP TABLE IF EXISTS "agent_messages";
DROP TABLE IF EXISTS "agent_threads";

-- Remove Slack fields from mailboxes table
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_bot_token";
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_bot_user_id";
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_team_id";
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "slack_escalation_channel";
ALTER TABLE "mailboxes_mailbox" DROP COLUMN IF EXISTS "vip_channel_id";

-- Remove Slack fields from conversation_messages table
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "slack_channel";
ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "slack_message_ts";

-- Remove Slack fields from faqs table
ALTER TABLE "faqs" DROP COLUMN IF EXISTS "slack_channel";
ALTER TABLE "faqs" DROP COLUMN IF EXISTS "slack_message_ts";

-- Remove Slack fields from notes table
ALTER TABLE "notes" DROP COLUMN IF EXISTS "slack_channel";
ALTER TABLE "notes" DROP COLUMN IF EXISTS "slack_message_ts";

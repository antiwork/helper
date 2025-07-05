ALTER TABLE "mailboxes_metadataapi" DROP CONSTRAINT "mailboxes_metadataapi_mailbox_id_key";--> statement-breakpoint
ALTER TABLE "saved_replies" DROP CONSTRAINT "saved_replies_unused_mailbox_id_mailboxes_mailbox_id_fk";
--> statement-breakpoint
DROP INDEX "agent_threads_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "mailboxes_aiusageevent_mailbox_id_a4908f79";--> statement-breakpoint
DROP INDEX "conversations_conversation_mailbox_id_7fb25662";--> statement-breakpoint
DROP INDEX "faqs_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "guide_session_events_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "guide_session_replays_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "guide_sessions_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "mailboxes_platformcustomer_mailbox_id_58ea76bf";--> statement-breakpoint
DROP INDEX "websites_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "tool_apis_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "tools_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "saved_replies_mailbox_id_idx";--> statement-breakpoint
DROP INDEX "saved_replies_slug_mailbox_unique";--> statement-breakpoint
ALTER TABLE "agent_threads" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "mailboxes_aiusageevent" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "conversations_conversation" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "faqs" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "guide_session_events" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "guide_session_replays" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "guide_sessions" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "mailboxes_metadataapi" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "mailboxes_platformcustomer" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "website_docs" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "tool_apis" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "tools" DROP COLUMN "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "saved_replies" DROP COLUMN "unused_mailbox_id";
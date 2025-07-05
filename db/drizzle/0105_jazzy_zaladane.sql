ALTER TABLE "agent_threads" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "mailboxes_aiusageevent" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "conversations_conversation" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "faqs" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "guide_session_events" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "guide_session_replays" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "guide_sessions" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "mailboxes_metadataapi" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "mailboxes_platformcustomer" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "website_docs" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "tool_apis" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "tools" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "saved_replies" RENAME COLUMN "mailbox_id" TO "unused_mailbox_id";--> statement-breakpoint
ALTER TABLE "mailboxes_metadataapi" DROP CONSTRAINT "mailboxes_metadataapi_mailbox_id_key";--> statement-breakpoint
ALTER TABLE "saved_replies" DROP CONSTRAINT "saved_replies_mailbox_id_mailboxes_mailbox_id_fk";
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
ALTER TABLE "saved_replies" ADD CONSTRAINT "saved_replies_unused_mailbox_id_mailboxes_mailbox_id_fk" FOREIGN KEY ("unused_mailbox_id") REFERENCES "public"."mailboxes_mailbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_threads_mailbox_id_idx" ON "agent_threads" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "mailboxes_aiusageevent_mailbox_id_a4908f79" ON "mailboxes_aiusageevent" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "conversations_conversation_mailbox_id_7fb25662" ON "conversations_conversation" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "faqs_mailbox_id_idx" ON "faqs" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "guide_session_events_mailbox_id_idx" ON "guide_session_events" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "guide_session_replays_mailbox_id_idx" ON "guide_session_replays" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "guide_sessions_mailbox_id_idx" ON "guide_sessions" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "mailboxes_platformcustomer_mailbox_id_58ea76bf" ON "mailboxes_platformcustomer" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "websites_mailbox_id_idx" ON "website_docs" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "tool_apis_mailbox_id_idx" ON "tool_apis" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "tools_mailbox_id_idx" ON "tools" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE INDEX "saved_replies_mailbox_id_idx" ON "saved_replies" USING btree ("unused_mailbox_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_replies_slug_mailbox_unique" ON "saved_replies" USING btree ("slug","unused_mailbox_id");--> statement-breakpoint
ALTER TABLE "mailboxes_metadataapi" ADD CONSTRAINT "mailboxes_metadataapi_mailbox_id_key" UNIQUE("unused_mailbox_id");
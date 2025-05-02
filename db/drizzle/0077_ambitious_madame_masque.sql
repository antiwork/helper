ALTER TABLE "agent_messages" ADD COLUMN "slack_channel" text;--> statement-breakpoint
ALTER TABLE "agent_messages" ADD COLUMN "message_ts" text;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_messages_slack_unique_idx" ON "agent_messages" USING btree ("slack_channel","message_ts");
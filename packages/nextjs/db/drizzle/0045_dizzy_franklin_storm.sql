COMMIT;--> statement-breakpoint
CREATE INDEX CONCURRENTLY "messages_slack_message_ts_idx" ON "messages" USING btree ("slack_message_ts");
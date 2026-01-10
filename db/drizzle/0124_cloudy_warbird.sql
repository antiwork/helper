CREATE INDEX "conversations_conversation_status_idx" ON "conversations_conversation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "conversations_conversation_updated_at_idx" ON "conversations_conversation" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "conversations_conversation_is_prompt_idx" ON "conversations_conversation" USING btree ("is_prompt");--> statement-breakpoint
CREATE INDEX "job_runs_updated_at_idx" ON "job_runs" USING btree ("updated_at");
ALTER TABLE "job_runs" ADD COLUMN "scheduled_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "job_runs_scheduled_at_idx" ON "job_runs" USING btree ("scheduled_at");
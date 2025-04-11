ALTER TABLE "guide_sessions" ALTER COLUMN "platform_customer_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "public"."guide_session_events" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."guide_session_event_type";--> statement-breakpoint
CREATE TYPE "public"."guide_session_event_type" AS ENUM('session_started', 'step_added', 'step_completed', 'step_updated', 'action_performed', 'completed', 'abandoned', 'paused');--> statement-breakpoint
ALTER TABLE "public"."guide_session_events" ALTER COLUMN "type" SET DATA TYPE "public"."guide_session_event_type" USING "type"::"public"."guide_session_event_type";
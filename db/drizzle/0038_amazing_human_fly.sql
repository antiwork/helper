ALTER TABLE "messages" ADD COLUMN "reaction_type" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reaction_feedback" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "reaction_created_at" timestamp with time zone;
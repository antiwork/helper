ALTER TABLE "faqs" ADD COLUMN "enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "suggested" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "suggested_replacement_for_id" bigint;
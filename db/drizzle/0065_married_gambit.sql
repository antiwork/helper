ALTER TABLE "faqs" ADD COLUMN "slack_channel" text;--> statement-breakpoint
ALTER TABLE "faqs" ADD COLUMN "slack_message_ts" text;--> statement-breakpoint
ALTER TABLE "faqs" DROP COLUMN "question";--> statement-breakpoint
ALTER TABLE "faqs" DROP COLUMN "body";
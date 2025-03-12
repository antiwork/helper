ALTER TABLE "conversations" ADD COLUMN "is_prompt" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversations" ADD COLUMN "is_visitor" boolean DEFAULT false NOT NULL;

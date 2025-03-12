-- Fix column names to match Drizzle's snake_case convention and correct table name
ALTER TABLE "conversations_conversation" ADD COLUMN IF NOT EXISTS "is_prompt" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversations_conversation" ADD COLUMN IF NOT EXISTS "is_visitor" boolean DEFAULT false NOT NULL;

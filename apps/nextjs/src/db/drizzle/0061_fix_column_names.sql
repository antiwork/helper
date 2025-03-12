-- Fix column names to match Drizzle's snake_case convention
ALTER TABLE "conversations_conversation" RENAME COLUMN "is_prompt" TO "is_prompt";
ALTER TABLE "conversations_conversation" RENAME COLUMN "is_visitor" TO "is_visitor";

-- Add columns if they don't exist (in case the previous migration didn't run)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE "conversations_conversation" ADD COLUMN "is_prompt" boolean DEFAULT false NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE "conversations_conversation" ADD COLUMN "is_visitor" boolean DEFAULT false NOT NULL;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

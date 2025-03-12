-- Drop previous columns if they exist (to avoid duplicate column errors)
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE "conversations_conversation" DROP COLUMN IF EXISTS "is_prompt";
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, column doesn't exist
    END;
    
    BEGIN
        ALTER TABLE "conversations_conversation" DROP COLUMN IF EXISTS "is_visitor";
    EXCEPTION WHEN OTHERS THEN
        -- Do nothing, column doesn't exist
    END;
END $$;

-- Add columns with correct names
ALTER TABLE "conversations_conversation" ADD COLUMN "is_prompt" boolean DEFAULT false NOT NULL;
ALTER TABLE "conversations_conversation" ADD COLUMN "is_visitor" boolean DEFAULT false NOT NULL;

-- Update existing records to have default values
UPDATE "conversations_conversation" SET "is_prompt" = false, "is_visitor" = false WHERE "is_prompt" IS NULL OR "is_visitor" IS NULL;

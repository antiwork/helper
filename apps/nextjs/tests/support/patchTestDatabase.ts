import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Applies necessary schema patches to the test database
 * This ensures that test databases have the correct schema even if migrations haven't been fully applied
 */
export const patchTestDatabase = async () => {
  try {
    // Add is_prompt and is_visitor columns to conversations_conversation if they don't exist
    await db.execute(sql`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE "conversations_conversation" ADD COLUMN "is_prompt" boolean DEFAULT false NOT NULL;
        EXCEPTION WHEN duplicate_column THEN
          -- Column already exists, do nothing
        END;
        
        BEGIN
          ALTER TABLE "conversations_conversation" ADD COLUMN "is_visitor" boolean DEFAULT false NOT NULL;
        EXCEPTION WHEN duplicate_column THEN
          -- Column already exists, do nothing
        END;
      END $$;
    `);

    // Add is_prompt and is_visitor columns to conversations if they don't exist
    await db.execute(sql`
      DO $$ 
      BEGIN
        BEGIN
          ALTER TABLE "conversations" ADD COLUMN "is_prompt" boolean DEFAULT false NOT NULL;
        EXCEPTION WHEN duplicate_column THEN
          -- Column already exists, do nothing
        END;
        
        BEGIN
          ALTER TABLE "conversations" ADD COLUMN "is_visitor" boolean DEFAULT false NOT NULL;
        EXCEPTION WHEN duplicate_column THEN
          -- Column already exists, do nothing
        END;
      END $$;
    `);

    console.log("Test database schema patched successfully");
  } catch (error) {
    console.error("Error patching test database schema:", error);
  }
};

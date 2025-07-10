#!/usr/bin/env tsx

/* eslint-disable no-console */
import { db } from "@/db/client";
import { savedReplies } from "@/db/schema";

const deleteSavedReplies = async () => {
  try {
    console.log("🗑️  Deleting all saved replies...");

    // Delete all saved replies
    const result = await db.delete(savedReplies);

    console.log(`✅ Successfully deleted all saved replies`);
    console.log(`🔢 Rows affected: ${result.rowCount || 0}`);

    return result.rowCount || 0;
  } catch (error) {
    console.error("❌ Failed to delete saved replies:", error);
    throw error;
  }
};

// Always run when this file is executed directly
console.log("🚀 Starting delete saved replies script...");

deleteSavedReplies()
  .then((count) => {
    console.log(`✨ Clean slate ready! Deleted ${count} saved replies.`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Script failed:", error);
    process.exit(1);
  });

export { deleteSavedReplies };

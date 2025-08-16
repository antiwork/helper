import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { savedReplies } from "../../../db/schema";

/**
 * Delete a saved reply by its exact name.
 * This function is designed to clean up specific saved replies created during e2e tests.
 */
export async function deleteSavedReplyByName(name: string) {
  try {
    console.log(`Deleting saved reply: ${name}`);

    // Delete saved reply with exact name match
    const result = await db
      .delete(savedReplies)
      .where(eq(savedReplies.name, name));

    console.log(`Deleted saved reply: ${name}`);
    
    return result.rowCount || 0;
  } catch (error) {
    console.error(`Failed to delete saved reply ${name}:`, error);
    throw error;
  }
}
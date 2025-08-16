import { eq } from "drizzle-orm";
import { db } from "../../../db/client";
import { savedReplies } from "../../../db/schema";

/**
 * Delete a saved reply by its exact name.
 * This function is designed to clean up specific saved replies created during e2e tests.
 */
export async function deleteSavedReplyByName(name: string) {
  try {
    const result = await db.delete(savedReplies).where(eq(savedReplies.name, name));

    return result.rowCount || 0;
  } catch (error) {
    //    Don't fail test
  }
}

import { inArray } from "drizzle-orm";
import { db } from "../../../db/client";
import { authUsers } from "../../../db/supabaseSchema/auth";

/**
 * Clean up test members by deleting their authUsers records.
 * This will cascade to delete related userProfiles records automatically.
 */
export async function cleanupTestMembers(emails: string[] = []) {
  try {
    if (emails.length === 0) {
      return;
    }

    await db.delete(authUsers).where(inArray(authUsers.email, emails));
  } catch (error) {}
}

import { eq, like } from "drizzle-orm";
import { db } from "../../../db/client";
import { userProfiles } from "../../../db/schema/userProfiles";
import { authUsers } from "../../../db/supabaseSchema/auth";

export async function cleanupTestMembers(emails: string[] = []) {
  try {
    if (emails.length === 0) {
      return;
    }

    console.log(`Cleaning up ${emails.length} test members:`, emails);

    // Delete specific test members by email
    for (const email of emails) {
      const user = await db
        .select({
          id: authUsers.id,
        })
        .from(authUsers)
        .where(eq(authUsers.email, email))
        .limit(1);

      if (user.length > 0) {
        await db.delete(userProfiles).where(eq(userProfiles.id, user[0].id));
        console.log(`Cleaned up test member: ${email}`);
      }
    }
  } catch (error) {
    console.error("Error cleaning up test members:", error);
  }
}

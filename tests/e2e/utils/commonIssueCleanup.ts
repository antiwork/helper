import { eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client";
import { issueGroups } from "../../../db/schema";

/**
 * Deletes common issues from the database by title
 * @param titles - Array of issue titles to delete
 * @returns Promise<void>
 */
export async function deleteCommonIssuesFromDb(titles: string[]): Promise<void> {
  try {
    if (titles.length > 0) {
      const result = await db.delete(issueGroups).where(inArray(issueGroups.title, titles));
      console.log(`✅ Test cleanup completed - deleted ${result.rowCount || 0} common issues`);
    }
  } catch (error) {
    console.warn("Failed during common issues cleanup:", error);
    // Don't fail the test suite due to cleanup issues
  }
}

/**
 * Deletes a single common issue from the database by title
 * @param title - Issue title to delete
 * @returns Promise<void>
 */
export async function deleteCommonIssueFromDb(title: string): Promise<void> {
  await deleteCommonIssuesFromDb([title]);
}
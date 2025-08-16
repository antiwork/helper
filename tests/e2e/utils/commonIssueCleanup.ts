import { eq, inArray } from "drizzle-orm";
import { db } from "../../../db/client";
import { issueGroups } from "../../../db/schema";

export async function deleteCommonIssuesFromDb(titles: string[]): Promise<void> {
  try {
    if (titles.length > 0) {
      await db.delete(issueGroups).where(inArray(issueGroups.title, titles));
    }
  } catch (error) {}
}

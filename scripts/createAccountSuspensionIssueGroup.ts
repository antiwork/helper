import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { issueGroups } from "@/db/schema/issueGroups";

async function createAccountSuspensionIssueGroup() {
  try {
    const existingGroup = await db
      .select()
      .from(issueGroups)
      .where(eq(issueGroups.title, "Account Suspension"));

    if (existingGroup.length > 0) {
      return existingGroup[0];
    }

    const newGroup = await db
      .insert(issueGroups)
      .values({
        title: "Account Suspension",
        description: "Issues related to account suspensions, suspended accounts, and suspension appeals",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return newGroup[0];
  } catch (error) {
    throw error;
  }
}

if (require.main === module) {
  createAccountSuspensionIssueGroup()
    .then(() => {
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}

export { createAccountSuspensionIssueGroup };

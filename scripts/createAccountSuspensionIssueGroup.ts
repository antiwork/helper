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
      console.log("Account Suspension issue group already exists:", existingGroup[0]);
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

    console.log("Created Account Suspension issue group:", newGroup[0]);
    return newGroup[0];
  } catch (error) {
    console.error("Error creating Account Suspension issue group:", error);
    throw error;
  }
}

if (require.main === module) {
  createAccountSuspensionIssueGroup()
    .then(() => {
      console.log("Script completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}

export { createAccountSuspensionIssueGroup };

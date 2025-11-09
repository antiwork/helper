import { isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { eq } from "drizzle-orm";

type NotificationType = "dailyReports" | "weeklyReports" | "vipNotifications" | "responseTimeAlerts";

/**
 * Get all team member emails for notifications
 * Filters out users without email addresses and respects email preferences
 */
export async function getTeamMemberEmails(notificationType?: NotificationType): Promise<string[]> {
  const users = await db
    .select({
      email: authUsers.email,
      preferences: userProfiles.preferences,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
    .where(isNull(userProfiles.deletedAt));

  return users
    .filter((user) => {
      if (!user.email) return false;
      // If no notification type specified, include all users (default: opt-in)
      if (!notificationType) return true;
      // Check if user has opted out of this specific notification type
      const emailPrefs = user.preferences?.emailNotifications;
      if (emailPrefs && emailPrefs[notificationType] === false) return false;
      // Default: opt-in (include user)
      return true;
    })
    .map((user) => user.email!)
    .filter((email): email is string => !!email);
}

/**
 * Get team members with their email preferences
 */
export async function getTeamMembersWithPreferences() {
  const users = await db
    .select({
      id: userProfiles.id,
      email: authUsers.email,
      displayName: userProfiles.displayName,
      preferences: userProfiles.preferences,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
    .where(isNull(userProfiles.deletedAt));

  return users
    .map((user) => ({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      preferences: user.preferences,
    }))
    .filter((user): user is typeof user & { email: string } => !!user.email);
}


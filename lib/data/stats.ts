import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, conversationMessages as emails, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getFullName } from "@/lib/auth/authUtils";

type DateRange = {
  startDate?: Date;
  endDate?: Date;
};

export type MemberStats = {
  id: string;
  email: string | undefined;
  displayName: string | null;
  replyCount: number;
}[];

export async function getMemberStats(dateRange?: DateRange): Promise<MemberStats> {
  const allUsers = await db
    .select({
      id: userProfiles.id,
      email: authUsers.email,
      displayName: userProfiles.displayName,
      access: userProfiles.access,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id));

  const memberIds = allUsers.map((user) => user.id);

  const dateConditions = [];
  if (dateRange?.startDate) {
    dateConditions.push(sql`${emails.createdAt} >= ${dateRange.startDate.toISOString()}`);
  }
  if (dateRange?.endDate) {
    dateConditions.push(sql`${emails.createdAt} <= ${dateRange.endDate.toISOString()}`);
  }

  const result = await db
    .select({
      id: emails.userId,
      replyCount: count(emails.id),
    })
    .from(emails)
    .innerJoin(conversations, eq(emails.conversationId, conversations.id))
    .where(and(eq(emails.role, "staff"), sql`${emails.userId} IN ${memberIds}`, ...dateConditions))
    .groupBy(emails.userId);

  const replyCounts = result.reduce<Record<string, number>>((acc, member) => {
    if (member.id) acc[member.id] = member.replyCount;
    return acc;
  }, {});

  return allUsers
    .map((user) => {
      return {
        id: user.id,
        email: user.email ?? undefined,
        displayName: getFullName(user),
        replyCount: replyCounts[user.id] || 0,
      };
    })
    .sort((a, b) => b.replyCount - a.replyCount);
}

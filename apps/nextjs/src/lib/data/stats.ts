import { and, count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations, conversationMessages as emails } from "@/db/schema";
import { Mailbox } from "@/lib/data/mailbox";
import { getClerkUserList, UserRole, UserRoles } from "@/lib/data/user";

type DateRange = {
  startDate?: Date;
  endDate?: Date;
};

export type MemberStats = {
  id: string;
  email: string | undefined;
  displayName: string | null;
  replyCount: number;
  role: UserRole;
}[];

export async function getMemberStats(mailbox: Mailbox, dateRange?: DateRange): Promise<MemberStats> {
  const { data: allUsers } = await getClerkUserList(mailbox.clerkOrganizationId);
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
      id: emails.clerkUserId,
      replyCount: count(emails.id),
    })
    .from(emails)
    .innerJoin(conversations, eq(emails.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.mailboxId, mailbox.id),
        eq(emails.role, "staff"),
        sql`${emails.clerkUserId} IN ${memberIds}`,
        ...dateConditions,
      ),
    )
    .groupBy(emails.clerkUserId);

  const replyCounts = result.reduce<Record<string, number>>((acc, member) => {
    if (member.id) acc[member.id] = member.replyCount;
    return acc;
  }, {});

  return allUsers
    .map((user) => {
      const mailboxAccess = user.publicMetadata?.mailboxAccess as Record<string, { role: UserRole }> | undefined;
      const mailboxRole = mailboxAccess?.[mailbox.id.toString()]?.role || UserRoles.AFK;

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        displayName: user.fullName,
        replyCount: replyCounts[user.id] || 0,
        role: mailboxRole,
      };
    })
    .sort((a, b) => b.replyCount - a.replyCount);
}

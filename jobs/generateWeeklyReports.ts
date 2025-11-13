import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { eq, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { mailboxes, userProfiles } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { TIME_ZONE } from "@/jobs/generateDailyReports";
import { triggerEvent } from "@/jobs/trigger";
import { getMemberStats, MemberStats } from "@/lib/data/stats";
import { WeeklyEmailReportTemplate } from "@/lib/emails/weeklyEmailReportTemplate";
import { env } from "@/lib/env";
import { sentEmailViaResend } from "@/lib/resend/client";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const formatDateRange = (start: Date, end: Date) => {
  return `Week of ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;
};

export async function generateWeeklyEmailReports() {
  const mailbox = await db.query.mailboxes.findFirst({
    where: isNull(sql`${mailboxes.preferences}->>'disabled'`),
  });
  if (!mailbox) return;

  await triggerEvent("reports/weekly", {});
}

type GenerateMailboxWeeklyEmailReportReturn = { skipped: true; reason: string } | "Email sent";
export const generateMailboxWeeklyEmailReport = async (): Promise<GenerateMailboxWeeklyEmailReportReturn> => {
  try {
    const mailbox = await db.query.mailboxes.findFirst({
      where: isNull(sql`${mailboxes.preferences}->>'disabled'`),
    });

    if (!mailbox) return { skipped: true, reason: "No mailbox found" };

    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      return { skipped: true, reason: "Email not configured" };
    }

    const result = await generateMailboxEmailReport({ mailbox });
    return result;
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  }
};

export async function generateMailboxEmailReport({
  mailbox,
}: {
  mailbox: typeof mailboxes.$inferSelect;
}): Promise<GenerateMailboxWeeklyEmailReportReturn> {
  const now = toZonedTime(new Date(), TIME_ZONE);
  const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), 1);
  const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 0 }), 1);

  const stats = await getMemberStats({
    startDate: lastWeekStart,
    endDate: lastWeekEnd,
  });

  if (!stats.length) {
    return { skipped: true, reason: "No stats found" };
  }

  const allMembersData = processAllMembers(stats);

  const tableData: { name: string; count: number }[] = [];

  for (const member of stats) {
    const name = member.displayName || member.email || `Unnamed user: ${member.id}`;

    tableData.push({
      name,
      count: member.replyCount,
    });
  }

  const humanUsers = tableData.sort((a, b) => b.count - a.count);
  const totalTicketsResolved = tableData.reduce((sum, agent) => sum + agent.count, 0);
  const activeUserCount = humanUsers.filter((user) => user.count > 0).length;

  const teamMembers = await db
    .select({
      email: authUsers.email,
      displayName: userProfiles.displayName,
    })
    .from(userProfiles)
    .innerJoin(authUsers, eq(userProfiles.id, authUsers.id))
    .where(or(isNull(userProfiles.preferences), sql`${userProfiles.preferences}->>'allowWeeklyEmail' != 'false'`));

  if (teamMembers.length === 0) {
    return { skipped: true, reason: "No team members found" };
  }

  const dateRange = formatDateRange(lastWeekStart, lastWeekEnd);
  const reactTemplate = WeeklyEmailReportTemplate({
    mailboxName: mailbox.name,
    dateRange,
    teamMembers: allMembersData.activeMembers,
    inactiveMembers: allMembersData.inactiveMembers,
    totalReplies: totalTicketsResolved,
    activeUserCount,
  });

  const emailResults = await sentEmailViaResend({
    memberList: teamMembers.filter((m) => !!m.email).map((m) => ({ email: m.email! })),
    subject: `Weekly report for ${mailbox.name}`,
    react: reactTemplate,
  });
  const failures = emailResults.filter((r) => !r.success);
  if (failures.length > 0) {
    captureExceptionAndLog({
      error: `Weekly report : failed to send ${failures.length}/${emailResults.length} emails`,
      hint: failures,
    });
  }

  return "Email sent";
}

function processAllMembers(members: MemberStats) {
  const activeMembers = members
    .filter((member) => member.replyCount > 0)
    .sort((a, b) => b.replyCount - a.replyCount)
    .map((member) => ({
      name: member.displayName || member.email || "Unknown",
      count: member.replyCount,
    }));

  const inactiveMembers = members
    .filter((member) => member.replyCount === 0)
    .map((member) => member.displayName || member.email || "Unknown");

  return { activeMembers, inactiveMembers };
}

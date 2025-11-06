import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { assertDefined } from "@/components/utils/assert";
import { mailboxes } from "@/db/schema";
import { TIME_ZONE } from "@/jobs/generateDailyReports";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { getMemberStats, MemberStats } from "@/lib/data/stats";
import { sendWeeklyReportEmail } from "@/lib/emails/teamNotifications";

const formatDateRange = (start: Date, end: Date) => {
  return `Week of ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;
};

export async function generateWeeklyReports() {
  const mailbox = await getMailbox();
  if (!mailbox) return;

  await triggerEvent("reports/weekly", {});
}

export const generateMailboxWeeklyReport = async () => {
  const mailbox = await getMailbox();
  if (!mailbox) {
    return;
  }

  const result = await generateMailboxReport({
    mailbox,
  });

  return result;
};

export async function generateMailboxReport({ mailbox }: { mailbox: typeof mailboxes.$inferSelect }) {
  const now = toZonedTime(new Date(), TIME_ZONE);
  const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), 1);
  const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 0 }), 1);

  const stats = await getMemberStats({
    startDate: lastWeekStart,
    endDate: lastWeekEnd,
  });

  if (!stats.length) {
    return "No stats found";
  }

  const activeMembers = stats
    .filter((member) => member.replyCount > 0)
    .sort((a, b) => b.replyCount - a.replyCount)
    .map((member) => ({
      name: member.displayName || member.email || "Unknown",
      count: member.replyCount,
      email: member.email || undefined,
    }));

  const inactiveMembers = stats
    .filter((member) => member.replyCount === 0)
    .map((member) => ({
      name: member.displayName || member.email || "Unknown",
      count: member.replyCount,
      email: member.email || undefined,
    }));

  const totalReplies = stats.reduce((sum, member) => sum + member.replyCount, 0);

  // Send email notification to team members
  const emailResult = await sendWeeklyReportEmail({
    mailboxName: mailbox.name,
    dateRange: formatDateRange(lastWeekStart, lastWeekEnd),
    activeMembers,
    inactiveMembers,
    totalReplies,
  });

  return { success: true, emailResult };
}

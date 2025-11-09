import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { mailboxes } from "@/db/schema";
import { TIME_ZONE } from "@/jobs/generateDailyReports";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { getMemberStats, MemberStats } from "@/lib/data/stats";
import { sendWeeklyReportEmail } from "@/lib/email/notifications";

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

export async function generateMailboxReport({
  mailbox,
}: {
  mailbox: typeof mailboxes.$inferSelect;
}) {
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

  const allMembersData = processAllMembers(stats, new Map());

  const activeMembers = stats
    .filter((member) => member.replyCount > 0)
    .sort((a, b) => b.replyCount - a.replyCount)
    .map((member) => ({
      name: member.displayName || member.email || `Unnamed user: ${member.id}`,
      count: member.replyCount,
    }));

  const inactiveMembers = stats
    .filter((member) => member.replyCount === 0)
    .map((member) => member.displayName || member.email || `Unnamed user: ${member.id}`);

  const totalTicketsResolved = stats.reduce((sum, member) => sum + member.replyCount, 0);
  const activeUserCount = activeMembers.length;

  const result = await sendWeeklyReportEmail({
    mailboxName: mailbox.name,
    weekRange: formatDateRange(lastWeekStart, lastWeekEnd),
    activeMembers,
    inactiveMembers,
    totalTicketsResolved,
    activeUserCount,
  });

  if (!result || typeof result.success !== "boolean") {
    return "Failed to send report";
  }
  return result.success ? "Report sent" : "Failed to send report";
}

function processAllMembers(members: MemberStats, _slackUsersByEmail: Map<string, string>) {
  // This function is kept for compatibility but no longer uses Slack
  const activeMembers = members.filter((member) => member.replyCount > 0).sort((a, b) => b.replyCount - a.replyCount);
  const inactiveMembers = members.filter((member) => member.replyCount === 0);

  const activeLines = activeMembers.map((member) => {
    const formattedCount = member.replyCount.toLocaleString();
    const userName = member.displayName || member.email || "Unknown";

    return `• ${userName}: ${formattedCount}`;
  });

  const inactiveList =
    inactiveMembers.length > 0
      ? inactiveMembers
          .map((member) => {
            const userName = member.displayName || member.email || "Unknown";
            return userName;
          })
          .join(", ")
      : "";

  return { activeLines, inactiveList };
}

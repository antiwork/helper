import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { mailboxes } from "@/db/schema";
import { TIME_ZONE } from "@/jobs/generateDailyReports";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { getMemberStats, MemberStats } from "@/lib/data/stats";
import { postGoogleChatWebhookMessage } from "@/lib/googleChat/webhook";

const formatDateRange = (start: Date, end: Date) => {
  return `Week of ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;
};

export async function generateWeeklyReports() {
  const mailbox = await getMailbox();
  if (!mailbox?.googleChatWebhookUrl) return;

  await triggerEvent("reports/weekly", {});
}

export const generateMailboxWeeklyReport = async () => {
  const mailbox = await getMailbox();
  if (!mailbox) {
    return;
  }

  if (!mailbox.googleChatWebhookUrl) return;

  const result = await generateMailboxReport({
    mailbox,
    googleChatWebhookUrl: mailbox.googleChatWebhookUrl,
  });

  return result;
};

export async function generateMailboxReport({
  mailbox,
  googleChatWebhookUrl,
}: {
  mailbox: typeof mailboxes.$inferSelect;
  googleChatWebhookUrl: string;
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

  const allMembersData = processAllMembers(stats);
  const totalTicketsResolved = stats.reduce((sum, member) => sum + member.replyCount, 0);
  const activeUserCount = stats.filter((member) => member.replyCount > 0).length;

  const peopleText = activeUserCount === 1 ? "person" : "people";

  const lines = [
    `Last week in the ${mailbox.name} mailbox`,
    formatDateRange(lastWeekStart, lastWeekEnd),
    "",
    ...(allMembersData.activeLines.length ? ["Team members:", ...allMembersData.activeLines, ""] : []),
    ...(allMembersData.inactiveList ? [`No tickets answered: ${allMembersData.inactiveList}`, ""] : []),
    ...(totalTicketsResolved > 0 ? [`Total replies: ${totalTicketsResolved.toLocaleString()} from ${activeUserCount} ${peopleText}`] : []),
  ].filter(Boolean);

  await postGoogleChatWebhookMessage(googleChatWebhookUrl, { text: lines.join("\n") });

  return "Report sent";
}

function processAllMembers(members: MemberStats) {
  const activeMembers = members.filter((member) => member.replyCount > 0).sort((a, b) => b.replyCount - a.replyCount);
  const inactiveMembers = members.filter((member) => member.replyCount === 0);

  const activeLines = activeMembers.map((member) => {
    const formattedCount = member.replyCount.toLocaleString();
    const userName = member.displayName || member.email || "Unknown";
    return `• ${userName}: ${formattedCount}`;
  });

  const inactiveList =
    inactiveMembers.length > 0
      ? inactiveMembers.map((member) => member.displayName || member.email || "Unknown").join(", ")
      : "";

  return { activeLines, inactiveList };
}

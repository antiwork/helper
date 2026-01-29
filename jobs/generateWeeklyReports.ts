import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { assertDefined } from "@/components/utils/assert";
import { mailboxes } from "@/db/schema";
import { TIME_ZONE } from "@/jobs/generateDailyReports";
import { triggerEvent } from "@/jobs/trigger";
import { getMailbox } from "@/lib/data/mailbox";
import { getMemberStats, MemberStats } from "@/lib/data/stats";
import { postGoogleChatMessage } from "@/lib/googleChat/client";
import { getSlackUsersByEmail, postSlackMessage } from "@/lib/slack/client";

const formatDateRange = (start: Date, end: Date) => {
  return `Week of ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;
};

export async function generateWeeklyReports() {
  const mailbox = await getMailbox();
  const hasSlack = !!(mailbox?.slackBotToken && mailbox.slackAlertChannel);
  const hasGoogleChat = !!mailbox?.googleChatWebhookUrl;
  if (!hasSlack && !hasGoogleChat) return;

  await triggerEvent("reports/weekly", {});
}

export const generateMailboxWeeklyReport = async () => {
  const mailbox = await getMailbox();
  if (!mailbox) {
    return;
  }

  // drizzle doesn't appear to do any type narrowing, even though we've filtered for non-null values
  // @see https://github.com/drizzle-team/drizzle-orm/issues/2956
  const hasSlack = !!(mailbox.slackBotToken && mailbox.slackAlertChannel);
  const hasGoogleChat = !!mailbox.googleChatWebhookUrl;
  if (!hasSlack && !hasGoogleChat) return;

  const result = await generateMailboxReport({
    mailbox,
    slackBotToken: hasSlack ? mailbox.slackBotToken! : null,
    slackAlertChannel: hasSlack ? mailbox.slackAlertChannel! : null,
  });

  return result;
};

export async function generateMailboxReport({
  mailbox,
  slackBotToken,
  slackAlertChannel,
}: {
  mailbox: typeof mailboxes.$inferSelect;
  slackBotToken: string | null;
  slackAlertChannel: string | null;
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

  const slackUsersByEmail = slackBotToken ? await getSlackUsersByEmail(slackBotToken) : new Map<string, string>();

  const allMembersData = processAllMembers(stats, slackUsersByEmail);

  const tableData: { name: string; count: number; slackUserId?: string }[] = [];

  for (const member of stats) {
    const name = member.displayName || `Unnamed user: ${member.id}`;
    const slackUserId = slackUsersByEmail.get(assertDefined(member.email));

    tableData.push({
      name,
      count: member.replyCount,
      slackUserId,
    });
  }

  const humanUsers = tableData.sort((a, b) => b.count - a.count);
  const totalTicketsResolved = tableData.reduce((sum, agent) => sum + agent.count, 0);
  const activeUserCount = humanUsers.filter((user) => user.count > 0).length;

  const peopleText = activeUserCount === 1 ? "person" : "people";

  if (slackBotToken && slackAlertChannel) {
    const blocks: any[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `Last week in the ${mailbox.name} mailbox:`,
          emoji: true,
        },
      },
    ];

  if (allMembersData.activeLines.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Team members:*",
      },
    });

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: allMembersData.activeLines.join("\n"),
      },
    });
  }

  if (allMembersData.inactiveList) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*No tickets answered:* ${allMembersData.inactiveList}`,
      },
    });
  }

  blocks.push({ type: "divider" });

  const summaryParts = [];
  if (totalTicketsResolved > 0) {
    summaryParts.push("*Total replies:*");
    summaryParts.push(`${totalTicketsResolved.toLocaleString()} from ${activeUserCount} ${peopleText}`);
  }

  if (summaryParts.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: summaryParts.join("\n"),
      },
    });
  }

    await postSlackMessage(slackBotToken, {
      channel: slackAlertChannel,
      text: formatDateRange(lastWeekStart, lastWeekEnd),
      blocks,
    });
  }

  if (mailbox.googleChatWebhookUrl) {
    const plainMembersData = processAllMembersPlainText(stats);
    const lines: string[] = [`*Last week in the ${mailbox.name} mailbox:*`];

    if (plainMembersData.activeLines.length > 0) {
      lines.push("*Team members:*", ...plainMembersData.activeLines);
    }
    if (plainMembersData.inactiveList) {
      lines.push(`*No tickets answered:* ${plainMembersData.inactiveList}`);
    }
    if (totalTicketsResolved > 0) {
      lines.push(`*Total replies:* ${totalTicketsResolved.toLocaleString()} from ${activeUserCount} ${peopleText}`);
    }

    await postGoogleChatMessage(mailbox.googleChatWebhookUrl, lines.join("\n"));
  }

  return "Report sent";
}

function processAllMembersPlainText(members: MemberStats) {
  const activeMembers = members.filter((member) => member.replyCount > 0).sort((a, b) => b.replyCount - a.replyCount);
  const inactiveMembers = members.filter((member) => member.replyCount === 0);

  const activeLines = activeMembers.map((member) => {
    const userName = member.displayName || member.email || "Unknown";
    return `• ${userName}: ${member.replyCount.toLocaleString()}`;
  });

  const inactiveList =
    inactiveMembers.length > 0
      ? inactiveMembers.map((member) => member.displayName || member.email || "Unknown").join(", ")
      : "";

  return { activeLines, inactiveList };
}

function processAllMembers(members: MemberStats, slackUsersByEmail: Map<string, string>) {
  const activeMembers = members.filter((member) => member.replyCount > 0).sort((a, b) => b.replyCount - a.replyCount);
  const inactiveMembers = members.filter((member) => member.replyCount === 0);

  const activeLines = activeMembers.map((member) => {
    const formattedCount = member.replyCount.toLocaleString();
    const slackUserId = slackUsersByEmail.get(member.email!);
    const userName = slackUserId ? `<@${slackUserId}>` : member.displayName || member.email || "Unknown";

    return `• ${userName}: ${formattedCount}`;
  });

  const inactiveList =
    inactiveMembers.length > 0
      ? inactiveMembers
          .map((member) => {
            const slackUserId = slackUsersByEmail.get(member.email!);
            const userName = slackUserId ? `<@${slackUserId}>` : member.displayName || member.email || "Unknown";

            return userName;
          })
          .join(", ")
      : "";

  return { activeLines, inactiveList };
}

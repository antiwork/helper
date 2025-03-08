import { endOfWeek, startOfWeek, subWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, eq, isNotNull } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { REPORT_HOUR, TIME_ZONE } from "@/inngest/functions/generateDailyReports";
import { getMemberStats } from "@/lib/data/stats";
import { getSlackUsersByEmail, postSlackMessage } from "@/lib/slack/client";

const formatDateRange = (start: Date, end: Date) => {
  return `Week of ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}`;
};

export async function generateWeeklyReports() {
  const mailboxesList = await db.query.mailboxes.findMany({
    columns: { id: true },
    where: and(isNotNull(mailboxes.slackBotToken), isNotNull(mailboxes.slackAlertChannel)),
  });

  if (!mailboxesList.length) return;

  for (const mailbox of mailboxesList) {
    await inngest.send({
      name: "reports/weekly",
      data: { mailboxId: mailbox.id },
    });
  }
}

export default inngest.createFunction(
  { id: "generate-weekly-reports" },
  { cron: `TZ=${TIME_ZONE} 0 ${REPORT_HOUR} * * 1` },
  generateWeeklyReports,
);

export const generateMailboxWeeklyReport = inngest.createFunction(
  { id: "generate-weekly-report-mailbox" },
  { event: "reports/weekly" },
  async ({ event, step }) => {
    const mailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, event.data.mailboxId),
    });
    if (!mailbox) {
      return;
    }

    // drizzle doesn't appear to do any type narrowing, even though we've filtered for non-null values
    // @see https://github.com/drizzle-team/drizzle-orm/issues/2956
    if (!mailbox.slackBotToken || !mailbox.slackAlertChannel) {
      return;
    }

    const result = await generateMailboxReport({
      mailbox,
      slackBotToken: mailbox.slackBotToken,
      slackAlertChannel: mailbox.slackAlertChannel,
    });

    return result;
  },
);

export async function generateMailboxReport({
  mailbox,
  slackBotToken,
  slackAlertChannel,
}: {
  mailbox: typeof mailboxes.$inferSelect;
  slackBotToken: string;
  slackAlertChannel: string;
}) {
  const now = toZonedTime(new Date(), TIME_ZONE);
  const lastWeekStart = subWeeks(startOfWeek(now, { weekStartsOn: 0 }), 1);
  const lastWeekEnd = subWeeks(endOfWeek(now, { weekStartsOn: 0 }), 1);

  const stats = await getMemberStats(mailbox, {
    startDate: lastWeekStart,
    endDate: lastWeekEnd,
  });

  if (!stats.length) {
    return "No stats found";
  }

  const slackUsersByEmail = await getSlackUsersByEmail(slackBotToken);
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

  const inactiveUsers = stats.filter((member) => member.replyCount === 0);
  const humanUsers = tableData.sort((a, b) => b.count - a.count);
  const totalTicketsResolved = tableData.reduce((sum, agent) => sum + agent.count, 0);
  const activeUserCount = humanUsers.filter((user) => user.count > 0).length;

  const userLines = humanUsers
    .filter((user) => user.count > 0)
    .map((user) => {
      const formattedCount = user.count.toLocaleString();
      const userName = user.slackUserId ? `<@${user.slackUserId}>` : user.name;
      return `• ${userName}: ${formattedCount}`;
    });

  const peopleText = activeUserCount === 1 ? "person" : "people";

  const inactiveUserMentions = inactiveUsers
    .map((user) => {
      const slackUserId = slackUsersByEmail.get(assertDefined(user.email));
      if (slackUserId) {
        return `<@${slackUserId}>`;
      }
      return user.displayName || user.email;
    })
    .join(", ");

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

  if (userLines.length > 0) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: userLines.join("\n"),
      },
    });
    blocks.push({
      type: "divider",
    });
  }

  const summaryParts = [];
  if (totalTicketsResolved > 0) {
    summaryParts.push("*Total replies:*");
    summaryParts.push(`${totalTicketsResolved.toLocaleString()} from ${activeUserCount} ${peopleText}`);
  }
  if (inactiveUserMentions) {
    if (totalTicketsResolved > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: summaryParts.join("\n"),
        },
      });
      blocks.push({
        type: "divider",
      });
      summaryParts.length = 0;
    }
    summaryParts.push("*People who didn't answer a support ticket:*");
    summaryParts.push(inactiveUserMentions);
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

  return "Report sent";
}

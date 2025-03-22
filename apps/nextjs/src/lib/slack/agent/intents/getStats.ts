import { format, subDays } from "date-fns";
import { and, count, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { IntentParameters, IntentResponse } from "../types";
import { checkMailboxRequirement } from "../utils";

export const getStats = async (parameters: IntentParameters): Promise<IntentResponse> => {
  const { timeframe = null } = parameters;

  try {
    const mailboxParam = parameters.mailbox;

    const mailboxResult = await checkMailboxRequirement(parameters, "get_stats");
    if (mailboxResult.requiresMailbox) {
      return {
        text: mailboxResult.text,
        blocks: mailboxResult.blocks,
      };
    }

    const mailboxId = mailboxResult.specifiedMailbox?.id;
    const mailboxName = mailboxResult.specifiedMailbox?.name || `Mailbox #${mailboxId}`;

    let startDate: Date | null = null;
    let timeframeLabel = "all time";

    if (timeframe) {
      const today = new Date();
      if (timeframe.includes("day") || timeframe.includes("24h") || timeframe.includes("today")) {
        startDate = subDays(today, 1);
        timeframeLabel = "the last 24 hours";
      } else if (timeframe.includes("week") || timeframe.includes("7d")) {
        startDate = subDays(today, 7);
        timeframeLabel = "the last 7 days";
      } else if (timeframe.includes("month") || timeframe.includes("30d")) {
        startDate = subDays(today, 30);
        timeframeLabel = "the last 30 days";
      }
    }

    const totalTicketsQuery = db
      .select({ count: count() })
      .from(conversations)
      .where(
        and(eq(conversations.mailboxId, mailboxId), startDate ? gte(conversations.createdAt, startDate) : sql`1=1`),
      );

    const openTicketsQuery = db
      .select({ count: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.mailboxId, mailboxId),
          eq(conversations.status, "open"),
          startDate ? gte(conversations.createdAt, startDate) : sql`1=1`,
        ),
      );

    const closedTicketsQuery = db
      .select({ count: count() })
      .from(conversations)
      .where(
        and(
          eq(conversations.mailboxId, mailboxId),
          eq(conversations.status, "closed"),
          startDate ? gte(conversations.createdAt, startDate) : sql`1=1`,
        ),
      );

    const [totalResult, openResult, closedResult] = await Promise.all([
      totalTicketsQuery,
      openTicketsQuery,
      closedTicketsQuery,
    ]);

    const totalCount = totalResult[0]?.count || 0;
    const openCount = openResult[0]?.count || 0;
    const closedCount = closedResult[0]?.count || 0;

    let dateRangeText = "";
    if (startDate) {
      const formattedDate = format(startDate, "MMMM d, yyyy");
      dateRangeText = `\n*Date Range:* ${formattedDate} to Present`;
    }

    const openPercentage = totalCount > 0 ? Math.round((openCount / totalCount) * 100) : 0;
    const closedPercentage = totalCount > 0 ? Math.round((closedCount / totalCount) * 100) : 0;

    const responseText = `*Ticket Statistics for ${mailboxName} (${timeframeLabel})*${dateRangeText}

*Total Tickets:* ${totalCount}
*Open Tickets:* ${openCount} (${openPercentage}%)
*Closed Tickets:* ${closedCount} (${closedPercentage}%)`;

    return {
      text: responseText,
    };
  } catch (error) {
    console.error("[SLACK_AGENT] Error getting stats:", error);
    return {
      text: "Sorry, I encountered an error while getting statistics. Please try again later.",
    };
  }
};

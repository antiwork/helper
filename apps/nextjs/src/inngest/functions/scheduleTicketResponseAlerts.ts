import { and, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";

export default inngest.createFunction(
  { id: "schedule-ticket-response-alerts" },
  { cron: "0 * * * *" }, // Run every hour to check for alerts that need to be scheduled
  async () => {
    // Check for mailboxes with hourly alerts
    const hourlyMailboxes = await db.query.mailboxes.findMany({
      where: and(
        isNotNull(mailboxes.slackBotToken),
        or(isNotNull(mailboxes.slackEscalationChannel), isNotNull(mailboxes.ticketResponseAlertsChannel)),
        eq(mailboxes.ticketResponseAlertsEnabled, true),
        eq(mailboxes.ticketResponseAlertsFrequency, "hourly"),
      ),
    });

    if (hourlyMailboxes.length > 0) {
      await inngest.send({
        name: "app/check-assigned-ticket-response-times",
        data: {
          frequency: "hourly",
        },
      });
    }

    // Check if it's 9 AM to run daily alerts
    const now = new Date();
    if (now.getHours() === 9 && now.getMinutes() < 5) {
      const dailyMailboxes = await db.query.mailboxes.findMany({
        where: and(
          isNotNull(mailboxes.slackBotToken),
          or(isNotNull(mailboxes.slackEscalationChannel), isNotNull(mailboxes.ticketResponseAlertsChannel)),
          eq(mailboxes.ticketResponseAlertsEnabled, true),
          eq(mailboxes.ticketResponseAlertsFrequency, "daily"),
        ),
      });

      if (dailyMailboxes.length > 0) {
        await inngest.send({
          name: "app/check-assigned-ticket-response-times",
          data: {
            frequency: "daily",
          },
        });
      }
    }

    // Check if it's Monday 9 AM to run weekly alerts
    if (now.getDay() === 1 && now.getHours() === 9 && now.getMinutes() < 5) {
      const weeklyMailboxes = await db.query.mailboxes.findMany({
        where: and(
          isNotNull(mailboxes.slackBotToken),
          or(isNotNull(mailboxes.slackEscalationChannel), isNotNull(mailboxes.ticketResponseAlertsChannel)),
          eq(mailboxes.ticketResponseAlertsEnabled, true),
          eq(mailboxes.ticketResponseAlertsFrequency, "weekly"),
        ),
      });

      if (weeklyMailboxes.length > 0) {
        await inngest.send({
          name: "app/check-assigned-ticket-response-times",
          data: {
            frequency: "weekly",
          },
        });
      }
    }

    return { success: true };
  },
);

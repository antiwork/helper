import { intervalToDuration, isWeekend } from "date-fns";
import { getMailbox } from "@/lib/data/mailbox";

export function formatDuration(start: Date): string {
  const duration = intervalToDuration({ start, end: new Date() });

  const parts: string[] = [];

  if (duration.days && duration.days > 0) {
    parts.push(`${duration.days} ${duration.days === 1 ? "day" : "days"}`);
  }

  if (duration.hours && duration.hours > 0) {
    parts.push(`${duration.hours} ${duration.hours === 1 ? "hour" : "hours"}`);
  }

  if (duration.minutes && duration.minutes > 0) {
    parts.push(`${duration.minutes} ${duration.minutes === 1 ? "minute" : "minutes"}`);
  }

  return parts.join(" ");
}

export const checkAssignedTicketResponseTimes = async (now = new Date()) => {
  if (isWeekend(now)) return { success: true, skipped: "weekend" };

  const mailbox = await getMailbox();
  if (!mailbox) return { success: true, skipped: "no_mailbox" };

  if (mailbox.preferences?.disableTicketResponseTimeAlerts) return { success: true, skipped: "disabled" };

  return { success: true, skipped: "slack_removed" };
};

import { Resend } from "resend";
import { render } from "@react-email/render";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { getBaseUrl } from "@/components/constants";
import { getTeamMemberEmails } from "./teamMembers";
import DailyReportEmail from "@/lib/emails/dailyReport";
import WeeklyReportEmail from "@/lib/emails/weeklyReport";
import VipNotificationEmail from "@/lib/emails/vipNotification";
import ResponseTimeAlertEmail from "@/lib/emails/responseTimeAlert";

/**
 * Send daily report email to all team members
 * Follows the same pattern as sendFollowerNotification.ts
 * Throws errors so the job system can retry failed sends
 */
export async function sendDailyReportEmail({
  mailboxName,
  openTickets,
  ticketsAnswered,
  openTicketsOverZero,
  ticketsAnsweredOverZero,
  averageReplyTime,
  vipAverageReplyTime,
  averageWaitTime,
}: {
  mailboxName: string;
  openTickets: number;
  ticketsAnswered: number;
  openTicketsOverZero?: number;
  ticketsAnsweredOverZero?: number;
  averageReplyTime?: string;
  vipAverageReplyTime?: string;
  averageWaitTime?: string;
}) {
  // Check if Resend is configured (matches pattern from sendFollowerNotification.ts)
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
    return;
  }

  const teamEmails = await getTeamMemberEmails("dailyReports");
  if (teamEmails.length === 0) {
    return { success: false, reason: "No team member emails found" };
  }

  // Render React Email component to HTML
  const html = await render(
    DailyReportEmail({
      mailboxName,
      openTickets,
      ticketsAnswered,
      openTicketsOverZero,
      ticketsAnsweredOverZero,
      averageReplyTime,
      vipAverageReplyTime,
      averageWaitTime,
    }),
  );

  const resend = new Resend(env.RESEND_API_KEY);
  const subject = `Daily Report for ${mailboxName}`;

  const emailPromises = teamEmails.map(async (email) => {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: email,
        subject,
        html,
      });
      return { email, success: true };
    } catch (error) {
      captureExceptionAndLog(error, { extra: { email, notificationType: "dailyReport" } });
      return { email, success: false, error };
    }
  });

  const results = await Promise.all(emailPromises);

  return {
    success: results.every((r) => r.success),
    results,
    sentTo: teamEmails.length,
  };
}

/**
 * Send weekly report email to all team members
 * Follows the same pattern as sendFollowerNotification.ts
 * Throws errors so the job system can retry failed sends
 */
export async function sendWeeklyReportEmail({
  mailboxName,
  weekRange,
  activeMembers,
  inactiveMembers,
  totalTicketsResolved,
  activeUserCount,
}: {
  mailboxName: string;
  weekRange: string;
  activeMembers: Array<{ name: string; count: number }>;
  inactiveMembers: string[];
  totalTicketsResolved: number;
  activeUserCount: number;
}) {
  // Check if Resend is configured (matches pattern from sendFollowerNotification.ts)
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
    return;
  }

  const teamEmails = await getTeamMemberEmails("weeklyReports");
  if (teamEmails.length === 0) {
    return { success: false, reason: "No team member emails found" };
  }

  // Render React Email component to HTML
  const html = await render(
    WeeklyReportEmail({
      mailboxName,
      weekRange,
      activeMembers,
      inactiveMembers,
      totalTicketsResolved,
      activeUserCount,
    }),
  );

  const resend = new Resend(env.RESEND_API_KEY);
  const subject = `Weekly Report for ${mailboxName} - ${weekRange}`;

  const emailPromises = teamEmails.map(async (email) => {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: email,
        subject,
        html,
      });
      return { email, success: true };
    } catch (error) {
      captureExceptionAndLog(error, { extra: { email, notificationType: "weeklyReport" } });
      return { email, success: false, error };
    }
  });

  const results = await Promise.all(emailPromises);

  return {
    success: results.every((r) => r.success),
    results,
    sentTo: teamEmails.length,
  };
}

/**
 * Send VIP notification email to all team members
 * Follows the same pattern as sendFollowerNotification.ts
 * Throws errors so the job system can retry failed sends
 */
export async function sendVipNotificationEmail({
  customerName,
  customerEmail,
  message,
  conversationSubject,
  conversationSlug,
  customerLinks,
  replyMessage,
  replyAuthor,
  closed,
}: {
  customerName: string;
  customerEmail: string;
  message: string;
  conversationSubject: string;
  conversationSlug: string;
  customerLinks?: Array<{ label: string; url: string }>;
  replyMessage?: string;
  replyAuthor?: string;
  closed?: boolean;
}) {
  // Check if Resend is configured (matches pattern from sendFollowerNotification.ts)
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
    return;
  }

  const teamEmails = await getTeamMemberEmails("vipNotifications");
  if (teamEmails.length === 0) {
    return { success: false, reason: "No team member emails found" };
  }

  const conversationLink = `${getBaseUrl()}/conversations?id=${conversationSlug}`;

  // Render React Email component to HTML
  const html = await render(
    VipNotificationEmail({
      customerName,
      customerEmail,
      message,
      conversationSubject,
      conversationLink,
      customerLinks,
      replyMessage,
      replyAuthor,
      closed,
    }),
  );

  const resend = new Resend(env.RESEND_API_KEY);
  const subject = `VIP Alert: ${conversationSubject}`;

  const emailPromises = teamEmails.map(async (email) => {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: email,
        subject,
        html,
      });
      return { email, success: true };
    } catch (error) {
      captureExceptionAndLog(error, { extra: { email, notificationType: "vipNotification" } });
      return { email, success: false, error };
    }
  });

  const results = await Promise.all(emailPromises);

  return {
    success: results.every((r) => r.success),
    results,
    sentTo: teamEmails.length,
  };
}

/**
 * Send response time alert email to all team members
 * Follows the same pattern as sendFollowerNotification.ts
 * Throws errors so the job system can retry failed sends
 */
export async function sendResponseTimeAlertEmail({
  alertType,
  mailboxName,
  overdueCount,
  tickets,
  threshold,
}: {
  alertType: "assigned" | "vip";
  mailboxName: string;
  overdueCount: number;
  tickets: Array<{ subject: string; slug: string; assignee?: string; timeSinceLastReply: string }>;
  threshold?: string;
}) {
  // Check if Resend is configured (matches pattern from sendFollowerNotification.ts)
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
    return;
  }

  const teamEmails = await getTeamMemberEmails("responseTimeAlerts");
  if (teamEmails.length === 0) {
    return { success: false, reason: "No team member emails found" };
  }

  const isVip = alertType === "vip";
  const title = isVip
    ? `${overdueCount} ${overdueCount === 1 ? "VIP has" : "VIPs have"} been waiting over ${threshold || "the threshold"}`
    : `${overdueCount} assigned tickets have been waiting over ${threshold || "24 hours"} without a response`;

  // Render React Email component to HTML
  const html = await render(
    ResponseTimeAlertEmail({
      alertType,
      mailboxName,
      overdueCount,
      tickets,
      threshold,
    }),
  );

  const resend = new Resend(env.RESEND_API_KEY);
  const subject = `Response Time Alert: ${mailboxName} - ${title}`;

  const emailPromises = teamEmails.map(async (email) => {
    try {
      await resend.emails.send({
        from: env.RESEND_FROM_ADDRESS!,
        to: email,
        subject,
        html,
      });
      return { email, success: true };
    } catch (error) {
      captureExceptionAndLog(error, { extra: { email, notificationType: "responseTimeAlert" } });
      return { email, success: false, error };
    }
  });

  const results = await Promise.all(emailPromises);

  return {
    success: results.every((r) => r.success),
    results,
    sentTo: teamEmails.length,
  };
}


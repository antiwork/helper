import { Resend } from "resend";
import { eq } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import DailyReportEmail from "@/lib/emails/dailyReport";
import WeeklyReportEmail from "@/lib/emails/weeklyReport";
import VipNotificationEmail from "@/lib/emails/vipNotification";
import TicketAlertEmail from "@/lib/emails/ticketAlert";

type DailyReportData = {
  mailboxName: string;
  openTicketCount: number;
  answeredTicketCount: number;
  openTicketsOverZero?: number;
  answeredTicketsOverZero?: number;
  avgReplyTime?: string;
  vipAvgReplyTime?: string;
  avgWaitTime?: string;
};

type WeeklyReportData = {
  mailboxName: string;
  dateRange: string;
  activeMembers: Array<{ name: string; count: number; email?: string }>;
  inactiveMembers: Array<{ name: string; count: number; email?: string }>;
  totalReplies: number;
};

type VipNotificationData = {
  customerEmail: string;
  customerValue: string;
  conversationSubject: string;
  messagePreview: string;
  conversationId: number;
  conversationSlug: string;
  replyText?: string;
  repliedBy?: string;
  conversationStatus: "open" | "closed";
};

type TicketAlertData = {
  alertType: "vip" | "assigned";
  mailboxName: string;
  overdueCount: number;
  expectedHours?: number;
  tickets: Array<{
    subject: string;
    slug: string;
    assignee?: string;
    timeSinceLastReply: string;
    customerName?: string;
    customerValue?: string;
  }>;
};

async function getTeamMembersWithEmailPref(
  preferenceKey: "dailyReports" | "weeklyReports" | "vipAlerts" | "ticketAlerts",
) {
  const allUsers = await db.query.userProfiles.findMany({
    columns: {
      id: true,
      displayName: true,
      preferences: true,
    },
    with: {
      user: {
        columns: {
          email: true,
        },
      },
    },
  });

  // Filter users who have email notifications enabled (opt-in) for this preference
  // If the preference is not set, default to enabled for backwards compatibility
  return allUsers.filter((user) => {
    const emailNotifications = user.preferences?.emailNotifications;
    if (!emailNotifications) return true; // Default to enabled
    return emailNotifications[preferenceKey] !== false; // Enabled if not explicitly disabled
  });
}

export async function sendDailyReportEmail(data: DailyReportData) {
  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      console.log("Resend not configured, skipping daily report email");
      return { success: false, reason: "Resend not configured" };
    }

    const teamMembers = await getTeamMembersWithEmailPref("dailyReports");

    if (teamMembers.length === 0) {
      return { success: false, reason: "No team members to notify" };
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const dashboardLink = `${env.AUTH_URL}/dashboard`;

    const emailPromises = teamMembers.map(async (member) => {
      const email = member.user?.email;
      if (!email) {
        return { success: false, reason: "No email address" };
      }

      try {
        await resend.emails.send({
          from: env.RESEND_FROM_ADDRESS!,
          to: assertDefined(email),
          subject: `Daily summary for ${data.mailboxName}`,
          react: DailyReportEmail({
            ...data,
            dashboardLink,
          }),
        });
        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error);
        return { success: false, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter((r) => r.success).length;

    return {
      success: true,
      totalRecipients: teamMembers.length,
      successCount,
      emailResults,
    };
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  }
}

export async function sendWeeklyReportEmail(data: WeeklyReportData) {
  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      console.log("Resend not configured, skipping weekly report email");
      return { success: false, reason: "Resend not configured" };
    }

    const teamMembers = await getTeamMembersWithEmailPref("weeklyReports");

    if (teamMembers.length === 0) {
      return { success: false, reason: "No team members to notify" };
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const dashboardLink = `${env.AUTH_URL}/dashboard`;

    const emailPromises = teamMembers.map(async (member) => {
      const email = member.user?.email;
      if (!email) {
        return { success: false, reason: "No email address" };
      }

      try {
        await resend.emails.send({
          from: env.RESEND_FROM_ADDRESS!,
          to: assertDefined(email),
          subject: `Weekly report for ${data.mailboxName}: ${data.dateRange}`,
          react: WeeklyReportEmail({
            ...data,
            dashboardLink,
          }),
        });
        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error);
        return { success: false, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter((r) => r.success).length;

    return {
      success: true,
      totalRecipients: teamMembers.length,
      successCount,
      emailResults,
    };
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  }
}

export async function sendVipNotificationEmail(data: VipNotificationData) {
  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      console.log("Resend not configured, skipping VIP notification email");
      return { success: false, reason: "Resend not configured" };
    }

    const teamMembers = await getTeamMembersWithEmailPref("vipAlerts");

    if (teamMembers.length === 0) {
      return { success: false, reason: "No team members to notify" };
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const conversationLink = `${env.AUTH_URL}/conversations?id=${data.conversationSlug}`;

    const emailPromises = teamMembers.map(async (member) => {
      const email = member.user?.email;
      if (!email) {
        return { success: false, reason: "No email address" };
      }

      const subject = data.replyText
        ? `VIP Customer Reply: ${data.conversationSubject}`
        : `VIP Customer Message: ${data.conversationSubject}`;

      try {
        await resend.emails.send({
          from: env.RESEND_FROM_ADDRESS!,
          to: assertDefined(email),
          subject,
          react: VipNotificationEmail({
            customerEmail: data.customerEmail,
            customerValue: data.customerValue,
            conversationSubject: data.conversationSubject,
            messagePreview: data.messagePreview,
            conversationLink,
            replyText: data.replyText,
            repliedBy: data.repliedBy,
            conversationStatus: data.conversationStatus,
          }),
        });
        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error);
        return { success: false, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter((r) => r.success).length;

    return {
      success: true,
      totalRecipients: teamMembers.length,
      successCount,
      emailResults,
    };
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  }
}

export async function sendTicketAlertEmail(data: TicketAlertData) {
  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_ADDRESS) {
      console.log("Resend not configured, skipping ticket alert email");
      return { success: false, reason: "Resend not configured" };
    }

    const teamMembers = await getTeamMembersWithEmailPref("ticketAlerts");

    if (teamMembers.length === 0) {
      return { success: false, reason: "No team members to notify" };
    }

    const resend = new Resend(env.RESEND_API_KEY);
    const dashboardLink = `${env.AUTH_URL}/dashboard`;

    const subject =
      data.alertType === "vip"
        ? `VIP Response Time Alert for ${data.mailboxName}`
        : `Ticket Response Time Alert for ${data.mailboxName}`;

    const emailPromises = teamMembers.map(async (member) => {
      const email = member.user?.email;
      if (!email) {
        return { success: false, reason: "No email address" };
      }

      try {
        await resend.emails.send({
          from: env.RESEND_FROM_ADDRESS!,
          to: assertDefined(email),
          subject,
          react: TicketAlertEmail({
            ...data,
            dashboardLink,
          }),
        });
        return { success: true };
      } catch (error) {
        captureExceptionAndLog(error);
        return { success: false, error };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successCount = emailResults.filter((r) => r.success).length;

    return {
      success: true,
      totalRecipients: teamMembers.length,
      successCount,
      emailResults,
    };
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  }
}

import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, inject, it, vi } from "vitest";
import {
  sendDailyReportEmail,
  sendResponseTimeAlertEmail,
  sendVipNotificationEmail,
  sendWeeklyReportEmail,
} from "@/lib/email/notifications";
import { getTeamMemberEmails } from "@/lib/email/teamMembers";
import * as sentryUtils from "@/lib/shared/sentry";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

vi.mock("@/lib/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    RESEND_API_KEY: "test-api-key",
    RESEND_FROM_ADDRESS: "test@example.com",
    AUTH_URL: "https://helperai.dev",
  },
}));

const mockEmailSend = vi.fn();
vi.mock("resend", () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: mockEmailSend },
  })),
}));

// Mock React Email components
vi.mock("@/lib/emails/dailyReport", () => ({
  default: vi.fn().mockReturnValue("Mock DailyReportEmail component"),
}));

vi.mock("@/lib/emails/weeklyReport", () => ({
  default: vi.fn().mockReturnValue("Mock WeeklyReportEmail component"),
}));

vi.mock("@/lib/emails/vipNotification", () => ({
  default: vi.fn().mockReturnValue("Mock VipNotificationEmail component"),
}));

vi.mock("@/lib/emails/responseTimeAlert", () => ({
  default: vi.fn().mockReturnValue("Mock ResponseTimeAlertEmail component"),
}));

// Mock @react-email/render
vi.mock("@react-email/render", () => ({
  render: vi.fn().mockResolvedValue("<html>Mock rendered email</html>"),
}));

vi.mock("@/lib/shared/sentry", () => ({
  captureExceptionAndLog: vi.fn(),
}));

vi.mock("@/components/constants", () => ({
  getBaseUrl: vi.fn().mockReturnValue("https://helperai.dev"),
}));

describe("Email Notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmailSend.mockResolvedValue({ id: "mock-email-id" });
  });

  describe("getTeamMemberEmails", () => {
    it("returns emails for all team members by default", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });
      const { user: user2 } = await userFactory.createRootUser({
        userOverrides: { email: "user2@example.com" },
      });

      const emails = await getTeamMemberEmails();
      expect(emails).toContain("user1@example.com");
      expect(emails).toContain("user2@example.com");
    });

    it("filters out users without email addresses", async () => {
      await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });
      await userFactory.createRootUser({
        userOverrides: { email: null },
      });

      const emails = await getTeamMemberEmails();
      expect(emails).toContain("user1@example.com");
      expect(emails).not.toContain(null);
    });

    it("respects email notification preferences - opt-out", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });
      const { user: user2 } = await userFactory.createRootUser({
        userOverrides: { email: "user2@example.com" },
      });

      // User1 opts out of daily reports
      await db
        .update(userProfiles)
        .set({
          preferences: {
            emailNotifications: {
              dailyReports: false,
            },
          },
        })
        .where(eq(userProfiles.id, user1.id));

      const emails = await getTeamMemberEmails("dailyReports");
      expect(emails).not.toContain("user1@example.com");
      expect(emails).toContain("user2@example.com");
    });

    it("includes users who haven't opted out (default opt-in)", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });
      const { user: user2 } = await userFactory.createRootUser({
        userOverrides: { email: "user2@example.com" },
      });

      // User1 explicitly opts in
      await db
        .update(userProfiles)
        .set({
          preferences: {
            emailNotifications: {
              dailyReports: true,
            },
          },
        });
      await db
        // No-op: ensure user2 has *not* set a preference (simulate default)
        // No update needed unless a specific non-empty set is required.
        const emails = await getTeamMemberEmails("dailyReports");
        expect(emails).toContain("user1@example.com");
        expect(emails).toContain("user2@example.com"); // User2 hasn't opted out, so included
    });
  });

  describe("sendDailyReportEmail", () => {
    it("returns early when Resend is not configured", async () => {
      vi.mocked(require("@/lib/env").env).RESEND_API_KEY = undefined;

      const result = await sendDailyReportEmail({
        mailboxName: "Test Mailbox",
        openTickets: 10,
        ticketsAnswered: 5,
      });

      expect(result).toBeUndefined();
      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it("returns early when no team member emails found", async () => {
      const result = await sendDailyReportEmail({
        mailboxName: "Test Mailbox",
        openTickets: 10,
        ticketsAnswered: 5,
      });

      expect(result).toEqual({ success: false, reason: "No team member emails found" });
      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it("sends daily report email to all team members", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });
      const { user: user2 } = await userFactory.createRootUser({
        userOverrides: { email: "user2@example.com" },
      });

      const result = await sendDailyReportEmail({
        mailboxName: "Test Mailbox",
        openTickets: 10,
        ticketsAnswered: 5,
        averageReplyTime: "2h 30m",
        vipAverageReplyTime: "1h 15m",
        averageWaitTime: "4h 20m",
      });

      expect(mockEmailSend).toHaveBeenCalledTimes(2);
      expect(mockEmailSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "user1@example.com",
        subject: "Daily Report for Test Mailbox",
        html: "<html>Mock rendered email</html>",
      });
      expect(result?.success).toBe(true);
      expect(result?.sentTo).toBe(2);
    });

    it("handles individual email sending failures gracefully", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });
      const { user: user2 } = await userFactory.createRootUser({
        userOverrides: { email: "user2@example.com" },
      });

      const sendError = new Error("Email provider failed");
      mockEmailSend.mockImplementation((payload) => {
        if (payload.to === "user2@example.com") throw sendError;
        return { id: "success-id" };
      });

      const result = await sendDailyReportEmail({
        mailboxName: "Test Mailbox",
        openTickets: 10,
        ticketsAnswered: 5,
      });

      expect(mockEmailSend).toHaveBeenCalledTimes(2);
      expect(sentryUtils.captureExceptionAndLog).toHaveBeenCalledWith(sendError, expect.any(Object));
      expect(result?.success).toBe(false); // Not all succeeded
      expect(result?.results).toHaveLength(2);
    });
  });

  describe("sendWeeklyReportEmail", () => {
    it("returns early when Resend is not configured", async () => {
      vi.mocked(require("@/lib/env").env).RESEND_API_KEY = undefined;

      const result = await sendWeeklyReportEmail({
        mailboxName: "Test Mailbox",
        weekRange: "Week of 2024-01-01 to 2024-01-07",
        activeMembers: [{ name: "John", count: 10 }],
        inactiveMembers: [],
        totalTicketsResolved: 50,
        activeUserCount: 1,
      });

      expect(result).toBeUndefined();
      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it("sends weekly report email to all team members", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });

      const result = await sendWeeklyReportEmail({
        mailboxName: "Test Mailbox",
        weekRange: "Week of 2024-01-01 to 2024-01-07",
        activeMembers: [
          { name: "John", count: 10 },
          { name: "Jane", count: 5 },
        ],
        inactiveMembers: ["Bob"],
        totalTicketsResolved: 50,
        activeUserCount: 2,
      });

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      expect(mockEmailSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "user1@example.com",
        subject: "Weekly Report for Test Mailbox - Week of 2024-01-01 to 2024-01-07",
        html: "<html>Mock rendered email</html>",
      });
      expect(result?.success).toBe(true);
    });
  });

  describe("sendVipNotificationEmail", () => {
    it("returns early when Resend is not configured", async () => {
      vi.mocked(require("@/lib/env").env).RESEND_API_KEY = undefined;

      const result = await sendVipNotificationEmail({
        customerName: "VIP Customer",
        customerEmail: "vip@example.com",
        message: "Test message",
        conversationSubject: "VIP Issue",
        conversationSlug: "test-slug",
      });

      expect(result).toBeUndefined();
      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it("sends VIP notification email to all team members", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });

      const result = await sendVipNotificationEmail({
        customerName: "VIP Customer",
        customerEmail: "vip@example.com",
        message: "Test message",
        conversationSubject: "VIP Issue",
        conversationSlug: "test-slug",
        customerLinks: [{ label: "Dashboard", url: "https://example.com" }],
        replyMessage: "Reply sent",
        replyAuthor: "John",
        closed: false,
      });

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      expect(mockEmailSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "user1@example.com",
        subject: "VIP Alert: VIP Issue",
        html: "<html>Mock rendered email</html>",
      });
      expect(result?.success).toBe(true);
    });

    it("handles closed conversations", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });

      const result = await sendVipNotificationEmail({
        customerName: "VIP Customer",
        customerEmail: "vip@example.com",
        message: "Test message",
        conversationSubject: "VIP Issue",
        conversationSlug: "test-slug",
        closed: true,
      });

      expect(mockEmailSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: "<html>Mock rendered email</html>",
        }),
      );
      expect(result?.success).toBe(true);
    });
  });

  describe("sendResponseTimeAlertEmail", () => {
    it("returns early when Resend is not configured", async () => {
      vi.mocked(require("@/lib/env").env).RESEND_API_KEY = undefined;

      const result = await sendResponseTimeAlertEmail({
        alertType: "assigned",
        mailboxName: "Test Mailbox",
        overdueCount: 5,
        tickets: [
          { subject: "Ticket 1", slug: "ticket-1", assignee: "John", timeSinceLastReply: "2 days" },
        ],
        threshold: "24 hours",
      });

      expect(result).toBeUndefined();
      expect(mockEmailSend).not.toHaveBeenCalled();
    });

    it("sends assigned ticket alert email", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });

      const result = await sendResponseTimeAlertEmail({
        alertType: "assigned",
        mailboxName: "Test Mailbox",
        overdueCount: 5,
        tickets: [
          { subject: "Ticket 1", slug: "ticket-1", assignee: "John", timeSinceLastReply: "2 days" },
          { subject: "Ticket 2", slug: "ticket-2", assignee: "Jane", timeSinceLastReply: "3 days" },
        ],
        threshold: "24 hours",
      });

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      expect(mockEmailSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "user1@example.com",
        subject: expect.stringContaining("Response Time Alert"),
        html: "<html>Mock rendered email</html>",
      });
      expect(result?.success).toBe(true);
    });

    it("sends VIP response time alert email", async () => {
      const { user: user1 } = await userFactory.createRootUser({
        userOverrides: { email: "user1@example.com" },
      });

      const result = await sendResponseTimeAlertEmail({
        alertType: "vip",
        mailboxName: "Test Mailbox",
        overdueCount: 3,
        tickets: [
          { subject: "VIP Ticket 1", slug: "vip-ticket-1", timeSinceLastReply: "5 hours" },
        ],
        threshold: "2 hours",
      });

      expect(mockEmailSend).toHaveBeenCalledTimes(1);
      expect(mockEmailSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "user1@example.com",
        subject: expect.stringContaining("Response Time Alert"),
        html: "<html>Mock rendered email</html>",
      });
      expect(result?.success).toBe(true);
    });
  });
});


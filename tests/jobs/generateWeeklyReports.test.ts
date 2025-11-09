import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMailboxReport, generateWeeklyReports } from "@/jobs/generateWeeklyReports";
import { getMemberStats } from "@/lib/data/stats";
import { sendWeeklyReportEmail } from "@/lib/email/notifications";

// Mock dependencies
vi.mock("@/lib/data/stats", () => ({
  getMemberStats: vi.fn(),
}));

vi.mock("@/lib/email/notifications", () => ({
  sendWeeklyReportEmail: vi.fn(),
}));

vi.mock("@/lib/data/user", async (importOriginal) => ({
  ...(await importOriginal()),
  UserRoles: {
    CORE: "core",
    NON_CORE: "nonCore",
    AFK: "afk",
  },
}));

const jobsMock = mockJobs();

describe("generateWeeklyReports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends weekly report events", async () => {
    await userFactory.createRootUser();
    await userFactory.createRootUser();

    await generateWeeklyReports();

    expect(jobsMock.triggerEvent).toHaveBeenCalledTimes(1);
    expect(jobsMock.triggerEvent).toHaveBeenCalledWith("reports/weekly", {});
  });
});

describe("generateMailboxWeeklyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and sends report email when there are stats", async () => {
    const { mailbox } = await userFactory.createRootUser();

    vi.mocked(getMemberStats).mockResolvedValue([
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 5 },
    ]);

    vi.mocked(sendWeeklyReportEmail).mockResolvedValue({
      success: true,
      results: [],
      sentTo: 1,
    });

    const result = await generateMailboxReport({
      mailbox,
    });

    expect(sendWeeklyReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        mailboxName: mailbox.name,
        weekRange: expect.stringMatching(/Week of \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}/),
        activeMembers: [{ name: "John Doe", count: 5 }],
        inactiveMembers: [],
        totalTicketsResolved: 5,
        activeUserCount: 1,
      }),
    );

    expect(result).toBe("Report sent");
  });

  it("generates and sends report email with both active and inactive members", async () => {
    const { mailbox } = await userFactory.createRootUser();

    // Create mock data with both active and inactive members
    vi.mocked(getMemberStats).mockResolvedValue([
      // Active members
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 10 },
      { id: "user2", email: "jane@example.com", displayName: "Jane Smith", replyCount: 5 },
      { id: "user3", email: "sam@example.com", displayName: "Sam Wilson", replyCount: 8 },
      { id: "user4", email: "pat@example.com", displayName: "Pat Brown", replyCount: 3 },
      // Inactive members
      { id: "user5", email: "alex@example.com", displayName: "Alex Johnson", replyCount: 0 },
      { id: "user6", email: "chris@example.com", displayName: "Chris Lee", replyCount: 0 },
      { id: "user7", email: "bob@example.com", displayName: "Bob White", replyCount: 0 },
    ]);

    vi.mocked(sendWeeklyReportEmail).mockResolvedValue({
      success: true,
      results: [],
      sentTo: 7,
    });

    const result = await generateMailboxReport({
      mailbox,
    });

    expect(sendWeeklyReportEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        mailboxName: mailbox.name,
        weekRange: expect.stringMatching(/Week of \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}/),
        activeMembers: [
          { name: "John Doe", count: 10 },
          { name: "Sam Wilson", count: 8 },
          { name: "Jane Smith", count: 5 },
          { name: "Pat Brown", count: 3 },
        ],
        inactiveMembers: ["Alex Johnson", "Chris Lee", "Bob White"],
        totalTicketsResolved: 26,
        activeUserCount: 4,
      }),
    );

    expect(result).toBe("Report sent");
  });

  it("skips report generation when there are no stats", async () => {
    const { mailbox } = await userFactory.createRootUser();

    vi.mocked(getMemberStats).mockResolvedValue([]);

    const result = await generateMailboxReport({
      mailbox,
    });

    expect(sendWeeklyReportEmail).not.toHaveBeenCalled();
    expect(result).toBe("No stats found");
  });
});

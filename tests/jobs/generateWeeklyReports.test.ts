import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMailboxReport, generateWeeklyReports } from "@/jobs/generateWeeklyReports";
import { getMemberStats } from "@/lib/data/stats";
import { postGoogleChatWebhookMessage } from "@/lib/googleChat/webhook";

// Mock dependencies
vi.mock("@/lib/data/stats", () => ({
  getMemberStats: vi.fn(),
}));

vi.mock("@/lib/googleChat/webhook", () => ({
  postGoogleChatWebhookMessage: vi.fn(),
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

  it("sends weekly report events for mailboxes with Google Chat configured", async () => {
    await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
      },
    });

    await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: null,
      },
    });

    await generateWeeklyReports();

    expect(jobsMock.triggerEvent).toHaveBeenCalledTimes(1);
    expect(jobsMock.triggerEvent).toHaveBeenCalledWith("reports/weekly", {});
  });
});

describe("generateMailboxWeeklyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and posts report to Google Chat when there are stats", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
      },
    });

    vi.mocked(getMemberStats).mockResolvedValue([
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 5 },
    ]);

    const result = await generateMailboxReport({
      mailbox,
      googleChatWebhookUrl: mailbox.googleChatWebhookUrl!,
    });

    expect(postGoogleChatWebhookMessage).toHaveBeenCalledWith(
      "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
      expect.objectContaining({
        text: expect.stringContaining(`Last week in the ${mailbox.name} mailbox`),
      }),
    );

    expect(result).toBe("Report sent");
  });

  it("generates and posts report with both active and inactive members", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
      },
    });

    // Create mock data with both core and non-core members, active and inactive
    vi.mocked(getMemberStats).mockResolvedValue([
      // Active core members
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 10 },
      { id: "user2", email: "jane@example.com", displayName: "Jane Smith", replyCount: 5 },
      // Inactive core member
      { id: "user3", email: "alex@example.com", displayName: "Alex Johnson", replyCount: 0 },
      // Active non-core members
      { id: "user4", email: "sam@example.com", displayName: "Sam Wilson", replyCount: 8 },
      { id: "user5", email: "pat@example.com", displayName: "Pat Brown", replyCount: 3 },
      // Inactive non-core member
      { id: "user6", email: "chris@example.com", displayName: "Chris Lee", replyCount: 0 },
      // AFK member
      { id: "user7", email: "bob@example.com", displayName: "Bob White", replyCount: 0 },
    ]);

    const result = await generateMailboxReport({
      mailbox,
      googleChatWebhookUrl: mailbox.googleChatWebhookUrl!,
    });

    expect(postGoogleChatWebhookMessage).toHaveBeenCalledWith(
      "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
      expect.objectContaining({
        text: expect.stringContaining("Team members:"),
      }),
    );

    expect(result).toBe("Report sent");
  });

  it("skips report generation when there are no stats", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
      },
    });

    vi.mocked(getMemberStats).mockResolvedValue([]);

    const result = await generateMailboxReport({
      mailbox,
      googleChatWebhookUrl: mailbox.googleChatWebhookUrl!,
    });

    expect(postGoogleChatWebhookMessage).not.toHaveBeenCalled();
    expect(result).toBe("No stats found");
  });
});

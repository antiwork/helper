import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMailboxReport, generateWeeklyReports } from "@/jobs/generateWeeklyReports";
import { getMemberStats } from "@/lib/data/stats";
import { getSlackUsersByEmail, postSlackMessage } from "@/lib/slack/client";

// Mock dependencies
vi.mock("@/lib/data/stats", () => ({
  getMemberStats: vi.fn(),
}));

vi.mock("@/lib/slack/client", () => ({
  postSlackMessage: vi.fn(),
  getSlackUsersByEmail: vi.fn(),
}));

vi.mock("@/lib/data/user", () => ({
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

  it("triggers weekly report only if mailbox is configured for Slack", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
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

  it("generates and posts report to Slack when there are stats", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });

    vi.mocked(getMemberStats).mockResolvedValue([
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 5, role: "core" },
    ]);

    vi.mocked(getSlackUsersByEmail).mockResolvedValue(new Map([["john@example.com", "SLACK123"]]));

    const result = await generateMailboxReport({
      mailbox,
      slackBotToken: mailbox.slackBotToken!,
      slackAlertChannel: mailbox.slackAlertChannel!,
    });

    expect(postSlackMessage).toHaveBeenCalledWith(
      "valid-token",
      expect.objectContaining({
        channel: "channel-id",
        blocks: [
          {
            type: "section",
            text: {
              type: "plain_text",
              text: `Last week in the ${mailbox.name} mailbox:`,
              emoji: true,
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Core members:*",
            },
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "• <@SLACK123>: 5",
            },
          },
          {
            type: "divider",
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Total replies:*\n5 from 1 person",
            },
          },
        ],
        text: expect.stringMatching(/Week of \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}/),
      }),
    );

    expect(result).toBe("Report sent");
  });

  it("generates and posts report with both core and non-core members", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });

    // Create mock data with both core and non-core members, active and inactive
    vi.mocked(getMemberStats).mockResolvedValue([
      // Active core members
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 10, role: "core" },
      { id: "user2", email: "jane@example.com", displayName: "Jane Smith", replyCount: 5, role: "core" },
      // Inactive core member
      { id: "user3", email: "alex@example.com", displayName: "Alex Johnson", replyCount: 0, role: "core" },
      // Active non-core members
      { id: "user4", email: "sam@example.com", displayName: "Sam Wilson", replyCount: 8, role: "nonCore" },
      { id: "user5", email: "pat@example.com", displayName: "Pat Brown", replyCount: 3, role: "nonCore" },
      // Inactive non-core member
      { id: "user6", email: "chris@example.com", displayName: "Chris Lee", replyCount: 0, role: "nonCore" },
      // AFK member
      { id: "user7", email: "bob@example.com", displayName: "Bob White", replyCount: 0, role: "afk" },
    ]);

    vi.mocked(getSlackUsersByEmail).mockResolvedValue(
      new Map([
        ["john@example.com", "SLACK1"],
        ["jane@example.com", "SLACK2"],
        ["alex@example.com", "SLACK3"],
        ["sam@example.com", "SLACK4"],
        ["pat@example.com", "SLACK5"],
        ["chris@example.com", "SLACK6"],
        ["bob@example.com", "SLACK7"],
      ]),
    );

    const result = await generateMailboxReport({
      mailbox,
      slackBotToken: mailbox.slackBotToken!,
      slackAlertChannel: mailbox.slackAlertChannel!,
    });

    expect(postSlackMessage).toHaveBeenCalledWith(
      "valid-token",
      expect.objectContaining({
        channel: "channel-id",
        blocks: expect.arrayContaining([
          // Header
          {
            type: "section",
            text: {
              type: "plain_text",
              text: `Last week in the ${mailbox.name} mailbox:`,
              emoji: true,
            },
          },
          // Core members header
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Core members:*",
            },
          },
          // Active core members mention by slack ID
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "• <@SLACK1>: 10\n• <@SLACK2>: 5",
            },
          },
          // Inactive core members
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*No tickets answered:* <@SLACK3>",
            },
          },
          // Divider between sections
          {
            type: "divider",
          },
          // Non-core members header
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Non-core members:*",
            },
          },
          // Active non-core members mention by name
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "• Sam Wilson: 8\n• Pat Brown: 3",
            },
          },
          // Inactive non-core members
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*No tickets answered:* Chris Lee",
            },
          },
          // Divider before total
          {
            type: "divider",
          },
          // Total replies
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Total replies:*\n26 from 4 people",
            },
          },
          // AFK member NOT mentioned
        ]),
        text: expect.stringMatching(/Week of \d{4}-\d{2}-\d{2} to \d{4}-\d{2}-\d{2}/),
      }),
    );

    expect(result).toBe("Report sent");
  });

  it("skips report generation when there are no stats", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });

    vi.mocked(getMemberStats).mockResolvedValue([]);

    const result = await generateMailboxReport({
      mailbox,
      slackBotToken: mailbox.slackBotToken!,
      slackAlertChannel: mailbox.slackAlertChannel!,
    });

    expect(postSlackMessage).not.toHaveBeenCalled();
    expect(result).toBe("No stats found");
  });
});

import { render } from "@react-email/render";
import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { generateMailboxEmailReport, generateWeeklyEmailReports } from "@/jobs/generateWeeklyReports";
import { getMemberStats } from "@/lib/data/stats";
import { sentEmailViaResend } from "@/lib/resend/client";

// Mock dependencies
vi.mock("@/lib/data/stats", () => ({
  getMemberStats: vi.fn(),
}));

vi.mock("@/lib/resend/client", () => ({
  sentEmailViaResend: vi.fn(),
}));
vi.mocked(sentEmailViaResend).mockResolvedValue([{ success: true }]);

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

  it("sends weekly email reports for mailboxes", async () => {
    await userFactory.createRootUser();

    await userFactory.createRootUser();

    await generateWeeklyEmailReports();

    expect(jobsMock.triggerEvent).toHaveBeenCalledTimes(1);
    expect(jobsMock.triggerEvent).toHaveBeenCalledWith("reports/weekly", {});
  });
});

describe("generateMailboxWeeklyReport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends emails when there are stats", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      userOverrides: { email: "john@example.com" },
    });

    vi.mocked(getMemberStats).mockResolvedValue([
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 5 },
    ]);

    const result = await generateMailboxEmailReport({ mailbox });

    expect(sentEmailViaResend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: `Weekly report for ${mailbox.name}`,
        memberList: expect.arrayContaining([{ email: user.email! }]),
        react: expect.anything(),
      }),
    );
    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    const html = await render(call.react);
    expect(html).toContain("John Doe");
    expect(html).toMatch(/>5<\/td>/);
    expect(call.subject).toBe(`Weekly report for ${mailbox.name}`);

    // react-emails may splits text nodes with comment markers to preserve whitespace/structure
    const normalized = html
      .replace(/<!--.*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
    expect(normalized).toContain("from 1 person");

    expect(result).toBe("Email sent");
  });

  it("sends emails with inactive members and correct totals", async () => {
    const { mailbox } = await userFactory.createRootUser({ userOverrides: { email: "john@example.com" } });

    // Active and inactive mix. Totals: 10 + 5 + 8 + 3 = 26 from 4 people
    vi.mocked(getMemberStats).mockResolvedValue([
      { id: "user1", email: "john@example.com", displayName: "John Doe", replyCount: 10 },
      { id: "user2", email: "jane@example.com", displayName: "Jane Smith", replyCount: 5 },
      { id: "user3", email: "alex@example.com", displayName: "Alex Johnson", replyCount: 0 },
      { id: "user4", email: "sam@example.com", displayName: "Sam Wilson", replyCount: 8 },
      { id: "user5", email: "pat@example.com", displayName: "Pat Brown", replyCount: 3 },
      { id: "user6", email: "chris@example.com", displayName: "Chris Lee", replyCount: 0 },
      { id: "user7", email: "bob@example.com", displayName: "Bob White", replyCount: 0 },
    ]);

    const result = await generateMailboxEmailReport({ mailbox });

    expect(sentEmailViaResend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: `Weekly report for ${mailbox.name}`,
        react: expect.anything(),
      }),
    );

    const call = vi.mocked(sentEmailViaResend).mock.calls.at(-1)![0];
    const html = await render(call.react);
    const normalized = html
      .replace(/<!--.*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();

    // Inactive members section should list the names
    expect(normalized).toContain("No tickets answered:");
    expect(normalized).toContain("Alex Johnson, Chris Lee, Bob White");

    // Totals block
    expect(normalized).toContain("26 replies");
    expect(normalized).toContain("from 4 people");

    expect(result).toBe("Email sent");
  });

  it("skips sending emails when there are no stats", async () => {
    const { mailbox } = await userFactory.createRootUser();

    vi.mocked(getMemberStats).mockResolvedValue([]);

    const result = await generateMailboxEmailReport({
      mailbox,
    });

    expect(sentEmailViaResend).not.toHaveBeenCalled();
    expect(result).toEqual({
      skipped: true,
      reason: "No stats found",
    });
  });

  it("excludes users with allowWeeklyEmail=false from recipients", async () => {
    const { mailbox, user: u1 } = await userFactory.createRootUser({
      userOverrides: { email: "a@example.com" },
    });
    const { user: u2 } = await userFactory.createRootUser({
      userOverrides: { email: "b@example.com" },
    });
    const { user: u3 } = await userFactory.createRootUser({
      userOverrides: { email: "c@example.com" },
    });

    await db
      .update(userProfiles)
      .set({ preferences: { allowWeeklyEmail: false } })
      .where(eq(userProfiles.id, u1.id));
    await db
      .update(userProfiles)
      .set({ preferences: { allowWeeklyEmail: false } })
      .where(eq(userProfiles.id, u2.id));

    vi.mocked(getMemberStats).mockResolvedValue([
      { id: u3.id, email: u3.email!, displayName: "User C", replyCount: 3 },
    ]);

    const result = await generateMailboxEmailReport({ mailbox });

    expect(sentEmailViaResend).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sentEmailViaResend).mock.calls[0]![0];
    expect(call.memberList).toEqual([{ email: "c@example.com" }]);
    expect(result).toBe("Email sent");
  });
});

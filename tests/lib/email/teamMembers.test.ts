import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, inject, it, vi } from "vitest";
import { getTeamMemberEmails, getTeamMembersWithPreferences } from "@/lib/email/teamMembers";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

vi.mock("@/lib/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
  },
}));

describe("getTeamMemberEmails", () => {
  beforeEach(async () => {
    // Database is truncated in setup.ts beforeEach
  });

  it("returns emails for all team members when no notification type specified", async () => {
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
    expect(emails.length).toBe(1);
  });

  it("respects email notification preferences - dailyReports opt-out", async () => {
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

  it("respects email notification preferences - weeklyReports opt-out", async () => {
    const { user: user1 } = await userFactory.createRootUser({
      userOverrides: { email: "user1@example.com" },
    });
    const { user: user2 } = await userFactory.createRootUser({
      userOverrides: { email: "user2@example.com" },
    });

    await db
      .update(userProfiles)
      .set({
        preferences: {
          emailNotifications: {
            weeklyReports: false,
          },
        },
      })
      .where(eq(userProfiles.id, user1.id));

    const emails = await getTeamMemberEmails("weeklyReports");
    expect(emails).not.toContain("user1@example.com");
    expect(emails).toContain("user2@example.com");
  });

  it("respects email notification preferences - vipNotifications opt-out", async () => {
    const { user: user1 } = await userFactory.createRootUser({
      userOverrides: { email: "user1@example.com" },
    });
    const { user: user2 } = await userFactory.createRootUser({
      userOverrides: { email: "user2@example.com" },
    });

    await db
      .update(userProfiles)
      .set({
        preferences: {
          emailNotifications: {
            vipNotifications: false,
          },
        },
      })
      .where(eq(userProfiles.id, user1.id));

    const emails = await getTeamMemberEmails("vipNotifications");
    expect(emails).not.toContain("user1@example.com");
    expect(emails).toContain("user2@example.com");
  });

  it("respects email notification preferences - responseTimeAlerts opt-out", async () => {
    const { user: user1 } = await userFactory.createRootUser({
      userOverrides: { email: "user1@example.com" },
    });
    const { user: user2 } = await userFactory.createRootUser({
      userOverrides: { email: "user2@example.com" },
    });

    await db
      .update(userProfiles)
      .set({
        preferences: {
          emailNotifications: {
            responseTimeAlerts: false,
          },
        },
      })
      .where(eq(userProfiles.id, user1.id));

    const emails = await getTeamMemberEmails("responseTimeAlerts");
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

    // User1 explicitly opts in, user2 has no preference (should be included)
    await db
      .update(userProfiles)
      .set({
        preferences: {
          emailNotifications: {
            dailyReports: true,
          },
        },
      })
      .where(eq(userProfiles.id, user1.id));

    const emails = await getTeamMemberEmails("dailyReports");
    expect(emails).toContain("user1@example.com");
    expect(emails).toContain("user2@example.com"); // User2 hasn't opted out, so included
  });

  it("filters out deleted users", async () => {
    const { user: user1 } = await userFactory.createRootUser({
      userOverrides: { email: "user1@example.com" },
    });
    const { user: user2 } = await userFactory.createRootUser({
      userOverrides: { email: "user2@example.com" },
    });

    // Mark user2 as deleted
    await db
      .update(userProfiles)
      .set({ deletedAt: new Date() })
      .where(eq(userProfiles.id, user2.id));

    const emails = await getTeamMemberEmails();
    expect(emails).toContain("user1@example.com");
    expect(emails).not.toContain("user2@example.com");
  });
});

describe("getTeamMembersWithPreferences", () => {
  it("returns team members with their preferences", async () => {
    const { user: user1 } = await userFactory.createRootUser({
      userOverrides: { email: "user1@example.com" },
    });

    await db
      .update(userProfiles)
      .set({
        preferences: {
          emailNotifications: {
            dailyReports: false,
            weeklyReports: true,
          },
        },
      })
      .where(eq(userProfiles.id, user1.id));

    const members = await getTeamMembersWithPreferences();
    const user1Member = members.find((m) => m.email === "user1@example.com");
    expect(user1Member).toBeDefined();
    expect(user1Member?.preferences?.emailNotifications?.dailyReports).toBe(false);
    expect(user1Member?.preferences?.emailNotifications?.weeklyReports).toBe(true);
  });
});



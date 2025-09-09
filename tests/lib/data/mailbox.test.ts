import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, test, vi } from "vitest";
import { getBaseUrl } from "@/components/constants";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { disconnectSlack, getMailboxInfo } from "@/lib/data/mailbox";
import { env } from "@/lib/env";
import { uninstallSlackApp } from "@/lib/slack/client";

vi.mock("@/lib/slack/client", () => ({
  uninstallSlackApp: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("getMailboxInfo", async () => {
  const { mailbox } = await userFactory.createRootUser();
  const info = getMailboxInfo(mailbox);
  expect(info).toEqual({
    id: mailbox.id,
    name: mailbox.name,
    slug: mailbox.slug,
    preferences: {},
    slackConnected: false,
    slackConnectUrl: expect.any(String),
    slackAlertChannel: null,
    widgetHMACSecret: mailbox.widgetHMACSecret,
    widgetDisplayMode: "always",
    widgetDisplayMinValue: null,
    widgetHost: null,
    vipThreshold: null,
    vipChannelId: null,
    vipExpectedResponseHours: null,
    githubConnectUrl: null,
    githubConnected: false,
    githubRepoName: null,
    githubRepoOwner: null,
    autoCloseDaysOfInactivity: 14,
    autoCloseEnabled: false,
    firecrawlEnabled: false,
  });

  const slackConnectUrl = new URL(info.slackConnectUrl!);
  expect(slackConnectUrl.origin).toBe("https://slack.com");
  expect(slackConnectUrl.pathname).toBe("/oauth/v2/authorize");
  const params = new URLSearchParams(slackConnectUrl.search);
  expect(params.get("scope")?.length).toBeGreaterThan(0);
  expect(params.get("redirect_uri")).toBe(`${getBaseUrl()}/api/connect/slack/callback`);
  expect(params.get("client_id")).toBe(env.SLACK_CLIENT_ID);
});

describe("disconnectSlack", () => {
  it("removes Slack-related data", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackTeamId: "T12345",
        slackBotUserId: "U12345",
        slackBotToken: "xoxb-12345",
        slackAlertChannel: "C12345",
      },
    });

    await disconnectSlack(mailbox.id);

    expect(uninstallSlackApp).toHaveBeenCalledWith("xoxb-12345");

    const updatedMailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, mailbox.id),
    });

    expect(updatedMailbox).toMatchObject({
      slackTeamId: null,
      slackBotUserId: null,
      slackBotToken: null,
      slackAlertChannel: null,
    });
  });

  it("silently continues if the Slack API call fails", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackTeamId: "T12345",
        slackBotUserId: "U12345",
        slackBotToken: "xoxb-12345",
        slackAlertChannel: "C12345",
      },
    });

    vi.mocked(uninstallSlackApp).mockRejectedValue(
      new Error("Failed to uninstall Slack app: App not installed in workspace"),
    );

    await disconnectSlack(mailbox.id);

    expect(uninstallSlackApp).toHaveBeenCalledWith("xoxb-12345");

    const updatedMailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, mailbox.id),
    });

    expect(updatedMailbox).toMatchObject({
      slackTeamId: null,
      slackBotUserId: null,
      slackBotToken: null,
      slackAlertChannel: null,
    });
  });

  it("handles case when Slack is already disconnected", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackTeamId: null,
        slackBotUserId: null,
        slackBotToken: null,
        slackAlertChannel: null,
      },
    });

    await disconnectSlack(mailbox.id);

    expect(uninstallSlackApp).not.toHaveBeenCalled();
  });
});

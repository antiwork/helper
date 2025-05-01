import { WebClient } from "@slack/web-api";
import { beforeEach, describe, expect, inject, it, vi } from "vitest";
import { env } from "@/lib/env";
import * as slackClient from "@/lib/slack/client";
import { SLACK_REDIRECT_URI } from "@/lib/slack/constants";

vi.mock("@slack/web-api");
vi.mock("@/lib/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    SLACK_CLIENT_ID: "test",
    SLACK_CLIENT_SECRET: "test",
  },
}));

const mockSlackClient = (implementation: { [K in keyof WebClient]?: Partial<WebClient[K]> }) => {
  return vi.mocked(WebClient).mockImplementation(() => implementation as WebClient);
};

describe("Slack client", () => {
  const mockToken = "mock-token";
  const mockChannel = "C1234567890";
  const mockTs = "1234567890.123456";
  const mockUserId = "U1234567890";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("listSlackChannels", () => {
    it("lists Slack channels", async () => {
      const mockList = vi
        .fn()
        .mockResolvedValueOnce({
          channels: [{ id: "channel1" }, { id: "channel2" }],
          response_metadata: { next_cursor: "next" },
        })
        .mockResolvedValueOnce({
          channels: [{ id: "channel3" }],
          response_metadata: { next_cursor: undefined },
        });

      mockSlackClient({
        conversations: { list: mockList },
      });

      const result = await slackClient.listSlackChannels("test-token");

      expect(WebClient).toHaveBeenCalledWith("test-token");
      expect(mockList).toHaveBeenCalledTimes(2);
      expect(mockList).toHaveBeenCalledWith({
        limit: 1000,
        cursor: undefined,
        exclude_archived: true,
      });
      expect(mockList).toHaveBeenCalledWith({
        limit: 1000,
        cursor: "next",
        exclude_archived: true,
      });
      expect(result).toEqual([{ id: "channel1" }, { id: "channel2" }, { id: "channel3" }]);
    });
  });

  describe("getSlackAccessToken", () => {
    it("gets a Slack access token", async () => {
      const mockAccess = vi.fn().mockResolvedValue({
        ok: true,
        team: { id: "team1" },
        bot_user_id: "bot1",
        access_token: "token1",
      });

      mockSlackClient({
        oauth: { v2: { access: mockAccess, exchange: vi.fn() } },
      });

      const result = await slackClient.getSlackAccessToken("test-code");

      expect(WebClient).toHaveBeenCalled();
      expect(mockAccess).toHaveBeenCalledWith({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code: "test-code",
        redirect_uri: SLACK_REDIRECT_URI,
      });
      expect(result).toEqual({
        teamId: "team1",
        botUserId: "bot1",
        accessToken: "token1",
      });
    });

    it("throws an error when getting a Slack access token fails", async () => {
      const mockAccess = vi.fn().mockResolvedValue({
        ok: false,
        error: "Invalid code",
      });

      mockSlackClient({
        oauth: { v2: { access: mockAccess, exchange: vi.fn() } },
      });

      await expect(slackClient.getSlackAccessToken("invalid-code")).rejects.toThrow("Invalid code");
    });
  });

  describe("getSlackPermalink", () => {
    it("returns the permalink", async () => {
      const mockPermalink = "https://slack.com/archives/C1234567890/p1234567890123456";
      mockSlackClient({
        chat: {
          getPermalink: vi.fn().mockResolvedValue({ permalink: mockPermalink }),
        },
      });

      const result = await slackClient.getSlackPermalink(mockToken, mockChannel, mockTs);
      expect(result).toBe(mockPermalink);
    });
  });

  describe("getSlackUser", () => {
    it("returns the user info", async () => {
      const mockUser = { id: mockUserId, name: "Test User" };
      mockSlackClient({
        users: {
          info: vi.fn().mockResolvedValue({ user: mockUser }),
        },
      });

      const result = await slackClient.getSlackUser(mockToken, mockUserId);
      expect(result).toEqual(mockUser);
    });
  });

  describe("postSlackMessage", () => {
    it("posts a regular message", async () => {
      const mockMessageTs = "1234567890.123456";
      mockSlackClient({
        chat: {
          postMessage: vi.fn().mockResolvedValue({ message: { ts: mockMessageTs } }),
        },
      });

      const result = await slackClient.postSlackMessage(mockToken, { channel: mockChannel, text: "Test message" });
      expect(result).toBe(mockMessageTs);
    });

    it("posts an ephemeral message", async () => {
      const mockMessageTs = "1234567890.123456";
      mockSlackClient({
        chat: {
          postEphemeral: vi.fn().mockResolvedValue({ message_ts: mockMessageTs }),
        },
      });

      const result = await slackClient.postSlackMessage(mockToken, {
        channel: mockChannel,
        text: "Test message",
        ephemeralUserId: mockUserId,
      });
      expect(result).toBe(mockMessageTs);
    });

    it("retries posting a message after joining the channel", async () => {
      const mockMessageTs = "1234567890.123456";
      const mockPostMessage = vi
        .fn()
        .mockRejectedValueOnce(new Error("not_in_channel"))
        .mockResolvedValueOnce({ message: { ts: mockMessageTs } });
      const mockJoinChannel = vi.fn().mockResolvedValue({ ok: true });

      mockSlackClient({
        chat: {
          postMessage: mockPostMessage,
        },
        conversations: {
          join: mockJoinChannel,
        },
      });

      const result = await slackClient.postSlackMessage(mockToken, { channel: mockChannel, text: "Test message" });

      expect(mockPostMessage).toHaveBeenCalledTimes(2);
      expect(mockJoinChannel).toHaveBeenCalledWith({ channel: mockChannel });
      expect(result).toBe(mockMessageTs);
    });
  });

  describe("updateSlackMessage", () => {
    it("updates a message", async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ ok: true });
      mockSlackClient({
        chat: {
          update: mockUpdate,
        },
      });

      await slackClient.updateSlackMessage({
        token: mockToken,
        channel: mockChannel,
        ts: mockTs,
        attachments: [],
        blocks: [],
      });
      expect(mockUpdate).toHaveBeenCalledWith({ channel: mockChannel, ts: mockTs, attachments: [], blocks: [] });
    });
  });

  describe("openSlackModal", () => {
    it("opens a modal", async () => {
      const mockView = { id: "V1234567890" };
      mockSlackClient({
        views: {
          open: vi.fn().mockResolvedValue({ ok: true, view: mockView }),
        },
      });

      const result = await slackClient.openSlackModal({
        token: mockToken,
        triggerId: "mock-trigger",
        title: "Test Modal",
        view: {},
      });
      expect(result).toEqual(mockView);
    });
  });

  describe("uninstallSlackApp", () => {
    it("uninstalls the app", async () => {
      const mockUninstall = vi.fn().mockResolvedValue({ ok: true });
      mockSlackClient({
        apps: {
          uninstall: mockUninstall,
        },
      });

      await slackClient.uninstallSlackApp(mockToken);
      expect(mockUninstall).toHaveBeenCalled();
    });
  });
});

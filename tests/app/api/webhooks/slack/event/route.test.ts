import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/slack/event/route";
import { disconnectSlack } from "@/lib/data/mailbox";
import { verifySlackRequest } from "@/lib/slack/client";

vi.mock("@/lib/slack/client", () => ({
  verifySlackRequest: vi.fn(),
}));

vi.mock("@/lib/data/mailbox", () => ({
  disconnectSlack: vi.fn(),
}));

describe("POST /api/webhooks/slack/event", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 403 when Slack request verification fails", async () => {
    vi.mocked(verifySlackRequest).mockResolvedValue(false);

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Signature verification failed" });
  });

  it("handles url_verification challenge", async () => {
    vi.mocked(verifySlackRequest).mockResolvedValue(true);

    const challenge = "test_challenge";
    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ type: "url_verification", challenge }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ challenge });
  });

  it("handles tokens_revoked event and disconnects Slack", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: { slackBotUserId: "bot_user_id", slackTeamId: "team_id" },
    });

    vi.mocked(verifySlackRequest).mockResolvedValue(true);

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({
        type: "event_callback",
        event: {
          type: "tokens_revoked",
          tokens: { bot: ["bot_user_id"] },
        },
        team_id: "team_id",
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(disconnectSlack).toHaveBeenCalledWith(mailbox.id);
  });

  it("returns 400 for invalid requests", async () => {
    vi.mocked(verifySlackRequest).mockResolvedValue(true);

    const request = new Request("http://localhost", {
      method: "POST",
      body: JSON.stringify({ type: "invalid_type" }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid request" });
  });
});

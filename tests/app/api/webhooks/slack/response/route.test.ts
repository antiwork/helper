import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/webhooks/slack/response/route";
import { verifySlackRequest } from "@/lib/slack/client";
import { handleMessageSlackAction } from "@/lib/slack/shared";

vi.mock("@/lib/slack/client", () => ({
  verifySlackRequest: vi.fn(),
}));

vi.mock("@/lib/slack/shared", () => ({
  handleMessageSlackAction: vi.fn(),
}));

describe("POST /api/webhooks/slack/response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when Slack request verification fails", async () => {
    vi.mocked(verifySlackRequest).mockResolvedValue(false);

    const request = new Request("http://localhost/api/webhooks/slack/response", {
      method: "POST",
      body: "payload={}",
    });

    const response = await POST(request);

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Invalid Slack signature" });
  });

  it("returns 400 when payload is missing message_ts", async () => {
    vi.mocked(verifySlackRequest).mockResolvedValue(true);

    const request = new Request("http://localhost/api/webhooks/slack/response", {
      method: "POST",
      body: "payload={}",
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid payload" });
  });

  it("handles VIP message action and returns 200", async () => {
    vi.mocked(verifySlackRequest).mockResolvedValue(true);
    const { conversation } = await conversationFactory.create();
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      slackMessageTs: "1234567890.123456",
      slackChannel: "test-channel",
    });

    const payload = {
      container: { message_ts: "1234567890.123456" },
      actions: [{ action_id: "test_action" }],
      user: { id: "U123456" },
    };

    const request = new Request("http://localhost/api/webhooks/slack/response", {
      method: "POST",
      body: `payload=${encodeURIComponent(JSON.stringify(payload))}`,
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(handleMessageSlackAction).toHaveBeenCalledWith(
      {
        conversationId: conversation.id,
        slackChannel: message.slackChannel,
        slackMessageTs: message.slackMessageTs,
      },
      payload,
    );
  });

  it("returns 404 when message is not found", async () => {
    vi.mocked(verifySlackRequest).mockResolvedValue(true);

    const payload = {
      container: { message_ts: "1234567890.123456" },
      actions: [{ action_id: "test_action" }],
      user: { id: "U123456" },
    };

    const request = new Request("http://localhost/api/webhooks/slack/response", {
      method: "POST",
      body: `payload=${encodeURIComponent(JSON.stringify(payload))}`,
    });

    const response = await POST(request);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Message not found" });
  });
});

import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getConversationById } from "@/lib/data/conversation";
import { createReply } from "@/lib/data/conversationMessage";
import { addNote } from "@/lib/data/note";
import { findUserViaSlack } from "@/lib/data/user";
import { openSlackModal, postSlackMessage } from "@/lib/slack/client";
import { handleMessageSlackAction } from "@/lib/slack/shared";

vi.mock("@/lib/data/user", () => ({
  findUserViaSlack: vi.fn(),
}));

vi.mock("@/lib/slack/client", () => ({
  openSlackModal: vi.fn(),
  postSlackMessage: vi.fn(),
}));

vi.mock("@/lib/data/conversationMessage", () => ({
  createReply: vi.fn(),
  getLastAiGeneratedDraft: vi.fn(),
}));

vi.mock("@/lib/data/note", () => ({
  addNote: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

describe("handleSlackAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a Slack modal when the action is respond_in_slack", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      userOverrides: {
        email: "user@example.com",
      },
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = {
      conversationId: conversation.id,
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    };

    vi.mocked(findUserViaSlack).mockResolvedValueOnce(user);

    const payload = {
      actions: [{ action_id: "respond_in_slack" }],
      user: { id: "U12345" },
      trigger_id: "trigger123",
    };

    await handleMessageSlackAction(message, payload);

    expect(openSlackModal).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "xoxb-12345678901234567890",
        triggerId: "trigger123",
        title: "Reply",
      }),
    );
  });

  it("closes the conversation when the action is close", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      userOverrides: {
        email: "user@example.com",
      },
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = {
      conversationId: conversation.id,
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    };

    const payload = {
      actions: [{ action_id: "close" }],
      user: { id: "U12345" },
    };

    vi.mocked(findUserViaSlack).mockResolvedValueOnce(user);

    await handleMessageSlackAction(message, payload);

    const updatedConversation = await getConversationById(conversation.id);
    expect(updatedConversation?.status).toBe("closed");
  });

  it("posts an ephemeral message when the Helper user is not found", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = {
      conversationId: conversation.id,
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    };

    vi.mocked(findUserViaSlack).mockResolvedValueOnce(null);

    const payload = {
      actions: [{ action_id: "respond_in_slack" }],
      user: { id: "U12345" },
    };

    await handleMessageSlackAction(message, payload);

    expect(postSlackMessage).toHaveBeenCalledWith(
      "xoxb-12345678901234567890",
      expect.objectContaining({
        ephemeralUserId: "U12345",
        channel: "C12345",
        text: expect.stringContaining("Helper user not found"),
      }),
    );
  });

  it("creates a reply when the sending method is email", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      userOverrides: {
        email: "user@example.com",
      },
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = {
      conversationId: conversation.id,
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    };

    const payload = {
      type: "view_submission",
      user: { id: "U12345" },
      view: {
        state: {
          values: {
            reply: { message: { value: "Test reply" } },
            escalation_actions: { sending_method: { selected_option: { value: "email" } } },
          },
        },
      },
    };

    vi.mocked(findUserViaSlack).mockResolvedValueOnce(user);

    await handleMessageSlackAction(message, payload);

    expect(createReply).toHaveBeenCalledWith({
      conversationId: conversation.id,
      message: "Test reply",
      user,
      close: false,
      slack: { channel: "C12345", messageTs: "1234567890.123456" },
    });
  });

  it("creates a reply and closes the conversation when the sending method is email_and_close", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      userOverrides: {
        email: "user@example.com",
      },
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = {
      conversationId: conversation.id,
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    };

    vi.mocked(findUserViaSlack).mockResolvedValueOnce(user);

    const payload = {
      type: "view_submission",
      user: { id: "U12345" },
      view: {
        state: {
          values: {
            reply: { message: { value: "Test reply and close" } },
            escalation_actions: { sending_method: { selected_option: { value: "email_and_close" } } },
          },
        },
      },
    };

    await handleMessageSlackAction(message, payload);

    expect(createReply).toHaveBeenCalledWith({
      conversationId: conversation.id,
      message: "Test reply and close",
      user,
      close: true,
      slack: { channel: "C12345", messageTs: "1234567890.123456" },
    });
  });

  it("adds a note when the sending method is note", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      userOverrides: {
        email: "user@example.com",
      },
      mailboxOverrides: { slackBotToken: "xoxb-12345678901234567890" },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);

    const message = {
      conversationId: conversation.id,
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    };

    vi.mocked(findUserViaSlack).mockResolvedValueOnce(user);

    const payload = {
      type: "view_submission",
      user: { id: "U12345" },
      view: {
        state: {
          values: {
            reply: { message: { value: "Test note" } },
            escalation_actions: { sending_method: { selected_option: { value: "note" } } },
          },
        },
      },
    };

    await handleMessageSlackAction(message, payload);

    expect(addNote).toHaveBeenCalledWith({
      conversationId: conversation.id,
      message: "Test note",
      user,
      slackChannel: "C12345",
      slackMessageTs: "1234567890.123456",
    });
  });
});

import { ExternalAccount, User } from "@clerk/nextjs/server";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBaseUrl } from "@/components/constants";
import { notifySlackAssignment } from "@/inngest/functions/postAssigneeOnSlack";
import { getClerkUser } from "@/lib/data/user";
import { postSlackDM, postSlackMessage } from "@/lib/slack/client";

vi.mock("@/lib/slack/client", () => ({
  postSlackDM: vi.fn(),
  postSlackMessage: vi.fn(),
}));

vi.mock("@/lib/data/user", () => ({
  getClerkUser: vi.fn(),
}));

describe("notifySlackAssignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts assignment to Slack DM when assignee has a Slack user ID", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });
    const user2 = userFactory.buildMockUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      assignedToClerkId: user.id,
      emailFrom: "sender@example.com",
    });

    vi.mocked(getClerkUser)
      .mockResolvedValueOnce({
        id: user2.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user2.fullName,
        externalAccounts: [] as ExternalAccount[],
      } as User)
      .mockResolvedValueOnce({
        id: user.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user.fullName,
        externalAccounts: [{ provider: "oauth_slack", externalId: "slack-user-id" }],
      } as User);

    const result = await notifySlackAssignment(conversation.id, {
      assignedToId: user.id,
      message: null,
      assignedById: user2.id,
    });

    expect(result).toBe("Posted");
    expect(postSlackDM).toHaveBeenCalledWith("valid-token", "slack-user-id", {
      text: `_Message from sender@example.com assigned to *you* by ${user2.fullName}_`,
      attachments: [
        {
          color: "#EF4444",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: expect.stringContaining(
                  `<${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}|View in Helper>`,
                ),
              },
            },
          ],
        },
      ],
    });
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("posts assignment to Slack channel when assignee has no Slack user ID", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });
    const user2 = userFactory.buildMockUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      assignedToClerkId: user.id,
      emailFrom: "sender@example.com",
    });

    vi.mocked(getClerkUser)
      .mockResolvedValueOnce({
        id: user2.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user2.fullName,
        externalAccounts: [] as ExternalAccount[],
      } as User)
      .mockResolvedValueOnce({
        id: user.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user.fullName,
        externalAccounts: [] as ExternalAccount[],
      } as User);

    const result = await notifySlackAssignment(conversation.id, {
      assignedToId: user.id,
      message: null,
      assignedById: user2.id,
    });

    expect(result).toBe("Posted");
    expect(postSlackMessage).toHaveBeenCalledWith("valid-token", {
      channel: "channel-id",
      mrkdwn: true,
      text: `_Message from sender@example.com assigned to *${user.fullName}* by ${user2.fullName}_`,
      attachments: [
        {
          color: "#EF4444",
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: expect.stringContaining(
                  `<${getBaseUrl()}/mailboxes/${mailbox.slug}/conversations?id=${conversation.slug}|View in Helper>`,
                ),
              },
            },
          ],
        },
      ],
    });
    expect(postSlackDM).not.toHaveBeenCalled();
  });

  it("does not post when mailbox is not linked to Slack", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: { slackBotToken: null },
    });
    const user2 = userFactory.buildMockUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      assignedToClerkId: user.id,
    });

    const result = await notifySlackAssignment(conversation.id, {
      assignedToId: user.id,
      message: null,
      assignedById: user2.id,
    });

    expect(result).toBe("Not posted, mailbox not linked to Slack or missing alert channel");
    expect(postSlackDM).not.toHaveBeenCalled();
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("does not post when conversation has no assignee", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });
    const { conversation } = await conversationFactory.create(mailbox.id, {
      assignedToClerkId: null,
    });

    const result = await notifySlackAssignment(conversation.id, {
      assignedToId: null,
      message: null,
      assignedById: user.id,
    });

    expect(result).toBe("Not posted, no assignee");
    expect(postSlackDM).not.toHaveBeenCalled();
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("posts assignment to Slack DM when assignee has a Slack user ID and conversation has been waiting over 24 hours", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });
    const user2 = userFactory.buildMockUser();
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const { conversation } = await conversationFactory.create(mailbox.id, {
      assignedToClerkId: user.id,
      emailFrom: "sender@example.com",
      lastUserEmailCreatedAt: twentyFiveHoursAgo,
    });

    vi.mocked(getClerkUser)
      .mockResolvedValueOnce({
        id: user2.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user2.fullName,
        externalAccounts: [] as ExternalAccount[],
      } as User)
      .mockResolvedValueOnce({
        id: user.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user.fullName,
        externalAccounts: [{ provider: "oauth_slack", externalId: "slack-user-id" }],
      } as User);

    const result = await notifySlackAssignment(conversation.id, {
      assignedToId: user.id,
      message: null,
      assignedById: user2.id,
    });

    expect(result).toBe("Posted");
    expect(postSlackDM).toHaveBeenCalled();
  });

  it("does not post assignment to Slack when conversation has not been waiting over 24 hours", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });
    const user2 = userFactory.buildMockUser();
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const { conversation } = await conversationFactory.create(mailbox.id, {
      assignedToClerkId: user.id,
      emailFrom: "sender@example.com",
      lastUserEmailCreatedAt: twelveHoursAgo,
    });

    vi.mocked(getClerkUser)
      .mockResolvedValueOnce({
        id: user2.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user2.fullName,
        externalAccounts: [] as ExternalAccount[],
      } as User)
      .mockResolvedValueOnce({
        id: user.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user.fullName,
        externalAccounts: [{ provider: "oauth_slack", externalId: "slack-user-id" }],
      } as User);

    const result = await notifySlackAssignment(conversation.id, {
      assignedToId: user.id,
      message: null,
      assignedById: user2.id,
    });

    expect(result).toBe("Not posted, conversation has not been waiting over 24 hours without a response");
    expect(postSlackDM).not.toHaveBeenCalled();
    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("does not post when conversation has no lastUserEmailCreatedAt", async () => {
    const { user, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
      },
    });
    const user2 = userFactory.buildMockUser();
    const { conversation } = await conversationFactory.create(mailbox.id, {
      assignedToClerkId: user.id,
      emailFrom: "sender@example.com",
      lastUserEmailCreatedAt: null,
    });

    vi.mocked(getClerkUser)
      .mockResolvedValueOnce({
        id: user2.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user2.fullName,
        externalAccounts: [] as ExternalAccount[],
      } as User)
      .mockResolvedValueOnce({
        id: user.id,
        firstName: "John",
        lastName: "Doe",
        fullName: user.fullName,
        externalAccounts: [{ provider: "oauth_slack", externalId: "slack-user-id" }],
      } as User);

    const result = await notifySlackAssignment(conversation.id, {
      assignedToId: user.id,
      message: null,
      assignedById: user2.id,
    });

    expect(result).toBe("Not posted, no last user email timestamp");
    expect(postSlackDM).not.toHaveBeenCalled();
    expect(postSlackMessage).not.toHaveBeenCalled();
  });
});

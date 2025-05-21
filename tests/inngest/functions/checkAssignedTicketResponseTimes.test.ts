import { InngestTestEngine } from "@inngest/test";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { subDays, subHours } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import checkAssignedTicketResponseTimes from "@/inngest/functions/checkAssignedTicketResponseTimes";
import { getSlackUsersByEmail, postSlackMessage } from "@/lib/slack/client";

vi.mock("@/lib/slack/client", () => ({
  postSlackMessage: vi.fn(),
  getSlackUsersByEmail: vi.fn(),
}));

vi.mock("@/lib/data/user", () => ({
  getClerkUserList: vi.fn(),
}));

describe("checkAssignedTicketResponseTimes", () => {
  const t = new InngestTestEngine({ function: checkAssignedTicketResponseTimes });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a Slack alert for overdue assigned tickets", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
        preferences: {},
      },
    });

    const overdueDate = subDays(new Date(), 2);
    await conversationFactory.create(mailbox.id, {
      assignedToId: user.id,
      lastUserEmailCreatedAt: overdueDate,
      status: "open",
    });

    vi.mocked(getSlackUsersByEmail).mockResolvedValue(new Map([[user.email!, "SLACK123"]]));

    await t.execute();

    expect(postSlackMessage).toHaveBeenCalledWith(
      "valid-token",
      expect.objectContaining({
        channel: "channel-id",
        text: expect.stringContaining("Assigned Ticket Response Time Alert"),
        blocks: expect.arrayContaining([
          expect.objectContaining({
            type: "section",
            text: expect.objectContaining({
              type: "mrkdwn",
              text: expect.stringContaining("assigned tickets have been waiting over 24 hours without a response"),
            }),
          }),
        ]),
      }),
    );
  });

  it("does not send a Slack alert for non-overdue assigned tickets", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
        preferences: {},
      },
    });

    const recentDate = subHours(new Date(), 12); // Only 12 hours ago, under the 24 hour threshold
    await conversationFactory.create(mailbox.id, {
      assignedToId: user.id,
      lastUserEmailCreatedAt: recentDate,
      status: "open",
    });

    vi.mocked(getSlackUsersByEmail).mockResolvedValue(new Map([[user.email!, "SLACK123"]]));

    await t.execute();

    expect(postSlackMessage).not.toHaveBeenCalled();
  });

  it("does not send a Slack alert when notifications are disabled", async () => {
    const { mailbox, user } = await userFactory.createRootUser({
      mailboxOverrides: {
        slackBotToken: "valid-token",
        slackAlertChannel: "channel-id",
        preferences: {
          disableTicketResponseTimeAlerts: true,
        },
      },
    });

    const overdueDate = subDays(new Date(), 2);
    await conversationFactory.create(mailbox.id, {
      assignedToId: user.id,
      lastUserEmailCreatedAt: overdueDate,
      status: "open",
    });

    vi.mocked(getSlackUsersByEmail).mockResolvedValue(new Map([[user.email!, "SLACK123"]]));

    await t.execute();

    expect(postSlackMessage).not.toHaveBeenCalled();
  });
});

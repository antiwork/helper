import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { subDays, subHours } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkAssignedTicketResponseTimes } from "@/jobs/checkAssignedTicketResponseTimes";
import { postGoogleChatWebhookMessage } from "@/lib/googleChat/webhook";

vi.mock("@/lib/googleChat/webhook", () => ({
  postGoogleChatWebhookMessage: vi.fn(),
}));

vi.mock("@/lib/data/user", async (importOriginal) => ({
  ...(await importOriginal()),
  getClerkUserList: vi.fn(),
}));

describe("checkAssignedTicketResponseTimes", () => {
  const now = new Date("2024-01-15T10:00:00Z");

  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(now);
  });

  it("sends a Google Chat alert for overdue assigned tickets", async () => {
    const { user } = await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
        preferences: {},
      },
    });

    const overdueDate = subDays(now, 2);
    await conversationFactory.create({
      assignedToId: user.id,
      lastUserEmailCreatedAt: overdueDate,
      status: "open",
    });

    await checkAssignedTicketResponseTimes(now);

    expect(postGoogleChatWebhookMessage).toHaveBeenCalledWith(
      "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
      expect.objectContaining({
        text: expect.stringContaining("assigned tickets have been waiting over 24 hours"),
      }),
    );
  });

  it("does not send a Google Chat alert for non-overdue assigned tickets", async () => {
    const { user } = await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
        preferences: {},
      },
    });

    const recentDate = subHours(now, 12); // Only 12 hours ago, under the 24 hour threshold
    await conversationFactory.create({
      assignedToId: user.id,
      lastUserEmailCreatedAt: recentDate,
      status: "open",
    });

    await checkAssignedTicketResponseTimes(now);

    expect(postGoogleChatWebhookMessage).not.toHaveBeenCalled();
  });

  it("does not send a Google Chat alert when notifications are disabled", async () => {
    const { user } = await userFactory.createRootUser({
      mailboxOverrides: {
        googleChatWebhookUrl: "https://chat.googleapis.com/v1/spaces/test/messages?key=key&token=token",
        preferences: {
          disableTicketResponseTimeAlerts: true,
        },
      },
    });

    const overdueDate = subDays(now, 2);
    await conversationFactory.create({
      assignedToId: user.id,
      lastUserEmailCreatedAt: overdueDate,
      status: "open",
    });

    await checkAssignedTicketResponseTimes();

    expect(postGoogleChatWebhookMessage).not.toHaveBeenCalled();
  });
});

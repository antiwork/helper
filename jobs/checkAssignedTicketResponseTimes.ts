import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { subDays, subHours } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkAssignedTicketResponseTimes } from "@/jobs/checkAssignedTicketResponseTimes";
import { sendResponseTimeAlertEmail } from "@/lib/email/notifications";

vi.mock("@/lib/email/notifications", () => ({
  sendResponseTimeAlertEmail: vi.fn(),
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

  it("sends an email alert for overdue assigned tickets", async () => {
    const { user } = await userFactory.createRootUser({
      mailboxOverrides: {
        preferences: {},
      },
    });

    const overdueDate = subDays(now, 2);
    await conversationFactory.create({
      assignedToId: user.id,
      lastUserEmailCreatedAt: overdueDate,
      status: "open",
      subject: "Test Ticket",
    });

    vi.mocked(sendResponseTimeAlertEmail).mockResolvedValue({
      success: true,
      results: [],
      sentTo: 1,
    });

    await checkAssignedTicketResponseTimes(now);

    expect(sendResponseTimeAlertEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        alertType: "assigned",
        mailboxName: expect.any(String),
        overdueCount: 1,
        threshold: "24 hours",
        tickets: expect.arrayContaining([
          expect.objectContaining({
            subject: "Test Ticket",
            assignee: expect.any(String),
            timeSinceLastReply: expect.any(String),
          }),
        ]),
      }),
    );
  });

  it("does not send an email alert for non-overdue assigned tickets", async () => {
    const { user } = await userFactory.createRootUser({
      mailboxOverrides: {
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

    expect(sendResponseTimeAlertEmail).not.toHaveBeenCalled();
  });

  it("does not send an email alert when notifications are disabled", async () => {
    const { user } = await userFactory.createRootUser({
      mailboxOverrides: {
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

    expect(sendResponseTimeAlertEmail).not.toHaveBeenCalled();
  });
});

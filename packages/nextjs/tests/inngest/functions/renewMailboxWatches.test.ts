import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { subscriptionFactory } from "@tests/support/factories/subscriptions";
import { userFactory } from "@tests/support/factories/users";
import { subDays } from "date-fns";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { renewMailboxWatches } from "@/inngest/functions/renewMailboxWatches";
import { FREE_TRIAL_PERIOD_DAYS } from "@/lib/auth/account";
import { getGmailService, subscribeToMailbox } from "@/lib/gmail/client";

vi.mock("@/lib/gmail/client", () => ({
  getGmailService: vi.fn(),
  subscribeToMailbox: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

describe("renewMailboxWatches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renews emails associated to free trials", async () => {
    const { mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        createdAt: subDays(new Date(), FREE_TRIAL_PERIOD_DAYS - 1),
      },
    });
    const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
      accessToken: "test_access_token",
      refreshToken: "test_refresh_token",
    });
    await db.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id }).where(eq(mailboxes.id, mailbox.id));

    const mockGmailService = { users: { watch: vi.fn() } };
    vi.mocked(getGmailService).mockReturnValue(mockGmailService as any);
    vi.mocked(subscribeToMailbox).mockResolvedValue({} as any);

    await renewMailboxWatches();

    expect(getGmailService).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "test_access_token", refreshToken: "test_refresh_token" }),
    );
    expect(subscribeToMailbox).toHaveBeenCalledWith(mockGmailService);
  });

  it("renews emails associated to an organization with an active subscription", async () => {
    const { organization, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        createdAt: subDays(new Date(), FREE_TRIAL_PERIOD_DAYS + 1),
      },
    });
    await subscriptionFactory.create(organization.id, { status: "active" });
    const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
      accessToken: "test_access_token",
      refreshToken: "test_refresh_token",
    });
    await db.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id }).where(eq(mailboxes.id, mailbox.id));

    const mockGmailService = { users: { watch: vi.fn() } };
    vi.mocked(getGmailService).mockReturnValue(mockGmailService as any);
    vi.mocked(subscribeToMailbox).mockResolvedValue({} as any);

    await renewMailboxWatches();

    expect(getGmailService).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: "test_access_token", refreshToken: "test_refresh_token" }),
    );
    expect(subscribeToMailbox).toHaveBeenCalledWith(mockGmailService);
  });

  it("skips emails associated to organizations past their free trial with no active subscription", async () => {
    const { organization, mailbox } = await userFactory.createRootUser({
      mailboxOverrides: {
        createdAt: subDays(new Date(), FREE_TRIAL_PERIOD_DAYS + 1),
      },
    });
    const { gmailSupportEmail } = await gmailSupportEmailFactory.create();
    await db.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id }).where(eq(mailboxes.id, mailbox.id));
    await subscriptionFactory.create(organization.id, { status: "incomplete" });

    await renewMailboxWatches();

    expect(getGmailService).not.toHaveBeenCalled();
    expect(subscribeToMailbox).not.toHaveBeenCalled();
  });
});

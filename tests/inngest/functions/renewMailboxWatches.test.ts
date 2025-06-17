import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { renewMailboxWatches } from "@/jobs/renewMailboxWatches";
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

  it("renews email watches", async () => {
    const { mailbox } = await userFactory.createRootUser();
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
});

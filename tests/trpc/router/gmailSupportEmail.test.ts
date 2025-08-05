import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { mockTriggerEvent } from "@tests/support/jobsUtils";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { eq } from "drizzle-orm";
import { describe, expect, inject, it, vi } from "vitest";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { gmailSupportEmails, mailboxes } from "@/db/schema";
import { createCaller } from "@/trpc";

vi.mock("@/jobs/client");
vi.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: vi.fn(() => ({
        setCredentials: vi.fn(),
      })),
    },
    gmail: vi.fn(() => ({
      users: {
        watch: vi.fn(),
        stop: vi.fn(),
      },
    })),
  },
}));
vi.mock("@/lib/env", () => ({
  isAIMockingEnabled: false,
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    GOOGLE_CLIENT_ID: "test-client-id",
  },
}));

describe("gmailSupportEmailRouter", () => {
  describe("get", () => {
    it("returns the Gmail support email for the mailbox", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { gmailSupportEmail } = await gmailSupportEmailFactory.create();
      await db.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id }).where(eq(mailboxes.id, mailbox.id));
      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.gmailSupportEmail.get();

      expect(result).toEqual({
        enabled: true,
        supportAccount: {
          id: gmailSupportEmail.id,
          email: gmailSupportEmail.email,
          createdAt: gmailSupportEmail.createdAt,
        },
      });
    });

    it("returns null if no Gmail support email exists for the mailbox", async () => {
      const { user } = await userFactory.createRootUser();
      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.gmailSupportEmail.get();

      expect(result).toEqual({ enabled: true, supportAccount: null });
    });
  });

  describe("create", () => {
    it("creates a new Gmail support email for the mailbox", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const caller = createCaller(await createTestTRPCContext(user));

      const input = {
        email: "support@example.com",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(),
      };

      await caller.gmailSupportEmail.create({
        ...input,
      });

      const updatedMailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.id, mailbox.id),
      });
      expect(updatedMailbox?.gmailSupportEmailId).toBeDefined();
      const createdEmail = await db.query.gmailSupportEmails
        .findFirst({
          where: eq(gmailSupportEmails.id, updatedMailbox!.gmailSupportEmailId!),
        })
        .then(assertDefined);

      expect(createdEmail).toMatchObject(input);

      expect(mockTriggerEvent).toHaveBeenCalledWith("gmail/import-recent-threads", {
        gmailSupportEmailId: createdEmail.id,
      });
    });
  });

  describe("delete", () => {
    it("deletes the Gmail support email for the mailbox", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { gmailSupportEmail } = await gmailSupportEmailFactory.create();
      await db.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id }).where(eq(mailboxes.id, mailbox.id));

      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.gmailSupportEmail.delete();

      expect(result).toEqual({ message: "Support email deleted successfully." });

      const deletedEmail = await db.query.gmailSupportEmails.findFirst({
        where: eq(gmailSupportEmails.id, gmailSupportEmail.id),
      });
      const updatedMailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.id, mailbox.id),
      });
      expect(deletedEmail).toBeUndefined();
      expect(updatedMailbox?.gmailSupportEmailId).toBeNull();
    });

    it("throws an error if no Gmail support email exists for the mailbox", async () => {
      const { user } = await userFactory.createRootUser();
      const caller = createCaller(await createTestTRPCContext(user));

      await expect(caller.gmailSupportEmail.delete()).rejects.toThrow("Gmail support email not found");
    });
  });
});

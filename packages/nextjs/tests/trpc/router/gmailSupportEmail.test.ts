import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { gmailSupportEmails, mailboxes } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { createCaller } from "@/trpc";

vi.mock("@/inngest/client");
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

describe("gmailSupportEmailRouter", () => {
  describe("get", () => {
    it("returns the Gmail support email for the mailbox", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { gmailSupportEmail } = await gmailSupportEmailFactory.create();
      await db.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id }).where(eq(mailboxes.id, mailbox.id));
      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.gmailSupportEmail.get({ mailboxSlug: mailbox.slug });

      expect(result).toEqual({
        id: gmailSupportEmail.id,
        email: gmailSupportEmail.email,
        createdAt: gmailSupportEmail.createdAt,
      });
    });

    it("returns null if no Gmail support email exists for the mailbox", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.gmailSupportEmail.get({ mailboxSlug: mailbox.slug });

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates a new Gmail support email for the mailbox", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const caller = createCaller(createTestTRPCContext(user, organization));

      const input = {
        email: "support@example.com",
        accessToken: "access_token",
        refreshToken: "refresh_token",
        expiresAt: new Date(),
      };

      await caller.gmailSupportEmail.create({
        mailboxSlug: mailbox.slug,
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

      expect(inngest.send).toHaveBeenCalledWith({
        name: "gmail/import-recent-threads",
        data: {
          gmailSupportEmailId: createdEmail.id,
        },
      });
    });
  });

  describe("delete", () => {
    it("deletes the Gmail support email for the mailbox", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { gmailSupportEmail } = await gmailSupportEmailFactory.create();
      await db.update(mailboxes).set({ gmailSupportEmailId: gmailSupportEmail.id }).where(eq(mailboxes.id, mailbox.id));

      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.gmailSupportEmail.delete({ mailboxSlug: mailbox.slug });

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
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const caller = createCaller(createTestTRPCContext(user, organization));

      await expect(caller.gmailSupportEmail.delete({ mailboxSlug: mailbox.slug })).rejects.toThrow(
        "Gmail support email not found",
      );
    });
  });
});

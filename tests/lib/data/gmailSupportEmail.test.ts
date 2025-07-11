import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { gmailSupportEmails, mailboxes } from "@/db/schema";
import { createGmailSupportEmail, deleteGmailSupportEmail, getGmailSupportEmail } from "@/lib/data/gmailSupportEmail";

describe("gmailSupportEmail", () => {
  describe("getGmailSupportEmail", () => {
    it("returns the Gmail support email for a mailbox", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
        email: "test@example.com",
      });

      await db
        .update(mailboxes)
        .set({ gmailSupportEmailId: gmailSupportEmail.id })
        .where(eq(mailboxes.id, mailbox.id))
        .execute();
      const updatedMailbox = await db.query.mailboxes.findFirst({
        where: eq(mailboxes.id, mailbox.id),
      });

      const result = await getGmailSupportEmail(updatedMailbox!);
      expect(result).toEqual(
        expect.objectContaining({
          id: gmailSupportEmail.id,
          email: "test@example.com",
        }),
      );
    });

    it("returns null when no Gmail support email is associated", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const result = await getGmailSupportEmail(mailbox);
      expect(result).toBeNull();
    });
  });

  describe("createGmailSupportEmail", () => {
    it("creates a new Gmail support email and associates it with a mailbox", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const info = {
        email: "new@example.com",
        accessToken: "new_access_token",
        refreshToken: "new_refresh_token",
        expiresAt: new Date(),
      };

      await db.transaction(async (tx) => {
        const result = await createGmailSupportEmail(info, tx);
        expect(result).toEqual(
          expect.objectContaining({
            email: "new@example.com",
            accessToken: "new_access_token",
            refreshToken: "new_refresh_token",
          }),
        );

        const updatedMailbox = await tx.query.mailboxes.findFirst({
          where: eq(mailboxes.id, mailbox.id),
        });
        expect(updatedMailbox?.gmailSupportEmailId).toBe(result.id);
      });
    });
  });

  describe("deleteGmailSupportEmail", () => {
    it("deletes a Gmail support email and removes the association from the mailbox", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { gmailSupportEmail } = await gmailSupportEmailFactory.create();

      await db
        .update(mailboxes)
        .set({ gmailSupportEmailId: gmailSupportEmail.id })
        .where(eq(mailboxes.id, mailbox.id))
        .execute();

      await db.transaction(async (tx) => {
        await deleteGmailSupportEmail(tx, gmailSupportEmail.id);

        const deletedEmail = await tx.query.gmailSupportEmails.findFirst({
          where: eq(gmailSupportEmails.id, gmailSupportEmail.id),
        });
        expect(deletedEmail).toBeUndefined();

        const updatedMailbox = await tx.query.mailboxes.findFirst({
          where: eq(mailboxes.id, mailbox.id),
        });
        expect(updatedMailbox?.gmailSupportEmailId).toBeNull();
      });
    });
  });
});

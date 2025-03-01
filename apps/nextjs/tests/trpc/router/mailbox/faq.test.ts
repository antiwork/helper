import { faqsFactory } from "@tests/support/factories/faqs";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { createCaller } from "@/trpc";

vi.mock("@/inngest/client");

describe("faqsRouter", () => {
  describe("list", () => {
    it("lists FAQs for a mailbox", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { faq } = await faqsFactory.create(mailbox.id);
      const caller = createCaller(createTestTRPCContext(user, organization));
      const faqs = await caller.mailbox.faqs.list({ mailboxSlug: mailbox.slug });
      expect(faqs).toHaveLength(1);
      expect(faqs[0]).toMatchObject({
        id: faq.id,
        content: faq.content,
        mailboxId: mailbox.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe("create", () => {
    it("creates a new FAQ", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const caller = createCaller(createTestTRPCContext(user, organization));
      await caller.mailbox.faqs.create({
        mailboxSlug: mailbox.slug,
        content: "Test Content",
      });

      const faqRow = await db.query.faqs.findFirst({
        where: eq(faqs.mailboxId, mailbox.id),
      });
      expect(faqRow).toMatchObject({
        content: "Test Content",
        mailboxId: mailbox.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(inngest.send).toHaveBeenCalledWith({
        name: "faqs/embedding.create",
        data: { faqId: faqRow!.id },
      });
    });
  });

  describe("update", () => {
    it("updates a FAQ", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { faq } = await faqsFactory.create(mailbox.id);
      const caller = createCaller(createTestTRPCContext(user, organization));
      await caller.mailbox.faqs.update({
        mailboxSlug: mailbox.slug,
        id: faq.id,
        content: "Updated Content",
      });

      const faqRow = await db.query.faqs.findFirst({
        where: eq(faqs.id, faq.id),
      });
      expect(faqRow).toMatchObject({
        content: "Updated Content",
        mailboxId: mailbox.id,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(inngest.send).toHaveBeenCalledWith({
        name: "faqs/embedding.create",
        data: { faqId: faqRow!.id },
      });
    });
  });

  describe("delete", () => {
    it("deletes a FAQ", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const { faq } = await faqsFactory.create(mailbox.id);
      const caller = createCaller(createTestTRPCContext(user, organization));
      await caller.mailbox.faqs.delete({
        id: faq.id,
        mailboxSlug: mailbox.slug,
      });

      const faqRow = await db.query.faqs.findFirst({
        where: eq(faqs.id, faq.id),
      });
      expect(faqRow).toBeUndefined();
    });

    it("throws an error when trying to delete a non-existent FAQ", async () => {
      const { user, mailbox, organization } = await userFactory.createRootUser();
      const caller = createCaller(createTestTRPCContext(user, organization));
      await expect(
        caller.mailbox.faqs.delete({
          mailboxSlug: mailbox.slug,
          id: 9999, // Non-existent ID
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});

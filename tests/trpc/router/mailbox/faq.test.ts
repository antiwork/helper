import { faqsFactory } from "@tests/support/factories/faqs";
import { userFactory } from "@tests/support/factories/users";
import { mockTriggerEvent } from "@tests/support/jobsUtils";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { createCaller } from "@/trpc";

describe("faqsRouter", () => {
  describe("list", () => {
    it("lists FAQs for a mailbox", async () => {
      const { user } = await userFactory.createRootUser();
      const { faq } = await faqsFactory.create();
      const caller = createCaller(await createTestTRPCContext(user));
      const faqs = await caller.mailbox.faqs.list();
      expect(faqs).toHaveLength(1);
      expect(faqs[0]).toMatchObject({
        id: faq.id,
        content: faq.content,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });

  describe("create", () => {
    it("creates a new FAQ", async () => {
      const { user } = await userFactory.createRootUser();
      const caller = createCaller(await createTestTRPCContext(user));
      await caller.mailbox.faqs.create({
        content: "Test Content",
      });

      const faqRow = await db.query.faqs.findFirst();
      expect(faqRow).toMatchObject({
        content: "Test Content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(mockTriggerEvent).toHaveBeenCalledWith("faqs/embedding.create", {
        faqId: faqRow!.id,
      });
    });
  });

  describe("update", () => {
    it("updates a FAQ", async () => {
      const { user } = await userFactory.createRootUser();
      const { faq } = await faqsFactory.create();
      const caller = createCaller(await createTestTRPCContext(user));
      await caller.mailbox.faqs.update({
        id: faq.id,
        content: "Updated Content",
      });

      const faqRow = await db.query.faqs.findFirst({
        where: eq(faqs.id, faq.id),
      });
      expect(faqRow).toMatchObject({
        content: "Updated Content",
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(mockTriggerEvent).toHaveBeenCalledWith("faqs/embedding.create", {
        faqId: faqRow!.id,
      });
    });
  });

  describe("delete", () => {
    it("deletes a FAQ", async () => {
      const { user } = await userFactory.createRootUser();
      const { faq } = await faqsFactory.create();
      const caller = createCaller(await createTestTRPCContext(user));
      await caller.mailbox.faqs.delete({
        id: faq.id,
      });

      const faqRow = await db.query.faqs.findFirst({
        where: eq(faqs.id, faq.id),
      });
      expect(faqRow).toBeUndefined();
    });

    it("throws an error when trying to delete a non-existent FAQ", async () => {
      const { user } = await userFactory.createRootUser();
      const caller = createCaller(await createTestTRPCContext(user));
      await expect(
        caller.mailbox.faqs.delete({
          id: 9999, // Non-existent ID
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});

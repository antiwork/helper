import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { and, eq, isNull } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { createCaller } from "@/trpc";

const jobsMock = mockJobs();

vi.mock("@/lib/data/conversationMessage", () => ({
  createReply: vi.fn().mockResolvedValue(123),
}));

describe("messagesRouter", () => {
  describe("flagAsBad", () => {
    it("flags an AI message as bad", async () => {
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create();
      const userMessage = await conversationFactory.createUserEmail(conversation.id);
      const { message: aiMessage } = await conversationMessagesFactory.createDraft(conversation.id, userMessage.id);

      const caller = createCaller(await createTestTRPCContext(user));
      await caller.mailbox.conversations.messages.flagAsBad({
        conversationSlug: conversation.slug,
        id: aiMessage.id,
        reason: "Incorrect information",
      });

      const updatedMessage = await db.query.conversationMessages.findFirst({
        where: and(
          eq(conversationMessages.id, aiMessage.id),
          eq(conversationMessages.conversationId, conversation.id),
          isNull(conversationMessages.deletedAt),
        ),
      });

      expect(updatedMessage?.isFlaggedAsBad).toBe(true);
      expect(updatedMessage?.reason).toBe("Incorrect information");
      expect(jobsMock.triggerEvent).toHaveBeenCalledWith("messages/flagged.bad", {
        messageId: aiMessage.id,
        reason: "Incorrect information",
      });
    });

    it("throws an error when trying to flag a non-existent message", async () => {
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create();

      const caller = createCaller(await createTestTRPCContext(user));

      await expect(
        caller.mailbox.conversations.messages.flagAsBad({
          conversationSlug: conversation.slug,
          id: 999999, // Non-existent message ID
          reason: "This message doesn't exist",
        }),
      ).rejects.toThrow("Message not found or not part of this conversation");
    });

    it("throws an error when trying to flag a user message", async () => {
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create();
      const userMessage = await conversationFactory.createUserEmail(conversation.id);

      const caller = createCaller(await createTestTRPCContext(user));

      await expect(
        caller.mailbox.conversations.messages.flagAsBad({
          conversationSlug: conversation.slug,
          id: userMessage.id,
          reason: "This is a user message",
        }),
      ).rejects.toThrow("Message not found or not part of this conversation");
    });
  });
});

import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm/expressions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { postEmailToResend } from "@/jobs/postEmailToResend";
import * as sentryUtils from "@/lib/shared/sentry";

const mockResendSend = vi.fn().mockResolvedValue({ data: { id: "resend-email-id" }, error: null });

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}));

vi.mock("@/lib/emails/conversationReply", () => ({
  default: vi.fn().mockReturnValue("Mock conversation reply email"),
}));

vi.mock("@/lib/env", async () => {
  const original = await vi.importActual<typeof import("@/lib/env")>("@/lib/env");
  return {
    ...original,
    env: {
      ...original.env,
      RESEND_API_KEY: "test-api-key",
      RESEND_FROM_ADDRESS: "test@example.com",
    },
  };
});

vi.spyOn(sentryUtils, "captureExceptionAndThrowIfDevelopment");

beforeEach(() => {
  vi.clearAllMocks();
});

const setupConversationForResendSending = async () => {
  const { mailbox } = await userFactory.createRootUser();

  const { conversation } = await conversationFactory.create(mailbox.id, {
    conversationProvider: "gmail",
    status: "closed",
    subject: "Conversation subject",
    emailFrom: "customer@example.com",
  });

  return { conversation, mailbox };
};

const assertMarkSent = async (emailId: number) => {
  const email = await db.query.conversationMessages.findFirst({ where: eq(conversationMessages.id, emailId) });
  expect(email?.status).toBe("sent");
};

const assertMarkFailed = async (emailId: number) => {
  const email = await db.query.conversationMessages
    .findFirst({ where: eq(conversationMessages.id, emailId) })
    .then(assertDefined);
  expect(email.status).toBe("failed");
  expect(await db.query.conversations.findFirst({ where: eq(conversations.id, email.conversationId) })).toMatchObject({
    status: "open",
  });
};

describe("postEmailToResend", () => {
  describe("on success", () => {
    it("properly sends email via Resend", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Test email content",
        role: "staff",
      });

      expect(await postEmailToResend({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "customer@example.com",
        subject: "Re: Conversation subject",
        react: "Mock conversation reply email",
      });
      await assertMarkSent(message.id);
    });

    it("sends email with default subject when conversation has no subject", async () => {
      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id, {
        conversationProvider: "gmail",
        status: "closed",
        subject: null,
        emailFrom: "customer@example.com",
      });

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Test email content",
        role: "staff",
      });

      expect(await postEmailToResend({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "customer@example.com",
        subject: "Reply from Helper",
        react: "Mock conversation reply email",
      });
      await assertMarkSent(message.id);
    });

    it("properly handles AI assistant messages", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "AI response content",
        role: "ai_assistant",
      });

      expect(await postEmailToResend({ messageId: message.id })).toBeNull();
      await assertMarkSent(message.id);
    });
  });

  describe("on failure", () => {
    it("returns null when the email is soft-deleted or not a queueing email", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
        deletedAt: new Date(),
      });

      expect(await postEmailToResend({ messageId: message.id })).toBeNull();
      expect(await db.query.conversations.findFirst({ where: eq(conversations.id, conversation.id) })).toMatchObject({
        status: "closed",
      });
      expect(
        await db.query.conversationMessages.findFirst({ where: eq(conversationMessages.id, message.id) }),
      ).toMatchObject({
        status: "queueing",
      });
    });

    it("marks the email as failed when the conversation emailFrom is missing", async () => {
      const { conversation } = await setupConversationForResendSending();
      const updatedConversation = await db
        .update(conversations)
        .set({ emailFrom: null })
        .where(eq(conversations.id, conversation.id))
        .returning()
        .then(takeUniqueOrThrow);

      const { message } = await conversationMessagesFactory.createEnqueued(updatedConversation.id, {
        body: "Content",
      });

      expect(await postEmailToResend({ messageId: message.id })).toEqual("The conversation emailFrom is missing.");
      await assertMarkFailed(message.id);
    });

    it("marks the email as failed when Resend is not configured", async () => {
      const { env } = await import("@/lib/env");
      const originalApiKey = env.RESEND_API_KEY;
      const originalFromAddress = env.RESEND_FROM_ADDRESS;

      // @ts-expect-error - Modifying mocked env for test
      env.RESEND_API_KEY = null;
      // @ts-expect-error - Modifying mocked env for test
      env.RESEND_FROM_ADDRESS = null;

      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      expect(await postEmailToResend({ messageId: message.id })).toEqual("Resend is not configured.");
      await assertMarkFailed(message.id);

      // Restore original values
      // @ts-expect-error - Restoring mocked env
      env.RESEND_API_KEY = originalApiKey;
      // @ts-expect-error - Restoring mocked env
      env.RESEND_FROM_ADDRESS = originalFromAddress;
    });

    it("marks the email as failed when Resend returns an error", async () => {
      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid API key" },
      });

      expect(await postEmailToResend({ messageId: message.id })).toEqual("Failed to send via Resend: Invalid API key");
      await assertMarkFailed(message.id);
    });

    it("marks the email as failed when there is an unexpected error", async () => {
      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      mockResendSend.mockRejectedValueOnce(new Error("Network error"));
      vi.mocked(sentryUtils.captureExceptionAndThrowIfDevelopment).mockImplementation(() => {});

      expect(await postEmailToResend({ messageId: message.id })).toEqual("Unexpected error: Error: Network error");
      await assertMarkFailed(message.id);
    });
  });
});

import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm/expressions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { sendEmail } from "@/jobs/postEmailToGmail";
import * as sentryUtils from "@/lib/shared/sentry";

const mockResendSend = vi.fn().mockResolvedValue({ data: { id: "resend-email-id" }, error: null });

vi.mock("resend", () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}));

vi.mock("@/lib/emails/aiReply", () => ({
  default: vi.fn().mockReturnValue("Mock AI reply email"),
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
  const { mailbox } = await userFactory.createRootUser({
    mailboxOverrides: { gmailSupportEmailId: null },
  });

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

describe("sendEmail (Resend Integration)", () => {
  describe("on success", () => {
    it("properly sends email via Resend when Gmail not configured", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Test email content",
        role: "staff",
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "customer@example.com",
        subject: "Re: Conversation subject",
        react: "Mock AI reply email",
      });
      await assertMarkSent(message.id);
    });

    it("sends email with default subject when conversation has no subject", async () => {
      const { conversation } = await setupConversationForResendSending();

      // Update conversation to have no subject
      const updatedConversation = await db
        .update(conversations)
        .set({ subject: null })
        .where(eq(conversations.id, conversation.id))
        .returning()
        .then(takeUniqueOrThrow);

      const { message } = await conversationMessagesFactory.createEnqueued(updatedConversation.id, {
        body: "Test email content",
        role: "staff",
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "customer@example.com",
        subject: "Reply from Helper",
        react: "Mock AI reply email",
      });
      await assertMarkSent(message.id);
    });

    it("properly handles AI assistant messages", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "AI generated response content",
        role: "ai_assistant",
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "customer@example.com",
        subject: "Re: Conversation subject",
        react: "Mock AI reply email",
      });
      await assertMarkSent(message.id);
    });

    it("properly handles messages with files attached", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content with attachments",
        role: "staff",
      });

      // Add some files to the message
      const { file: file1 } = await fileFactory.create(null, {
        isInline: true,
        name: "document.pdf",
        key: "document.pdf",
        mimetype: "application/pdf",
        messageId: message.id,
      });
      const { file: file2 } = await fileFactory.create(null, {
        isInline: false,
        name: "screenshot.jpg",
        key: "screenshot.jpg",
        mimetype: "image/jpeg",
        messageId: message.id,
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledTimes(1);
      await assertMarkSent(message.id);
    });

    it("handles empty body content gracefully", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: null,
        role: "staff",
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          react: "Mock AI reply email",
        }),
      );
      await assertMarkSent(message.id);
    });

    it("uses correct mailbox configuration", async () => {
      const { conversation, mailbox } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Test content",
        role: "staff",
      });

      await sendEmail({ messageId: message.id });

      // Verify the email object passed to Resend includes correct mailbox data
      const email = await db.query.conversationMessages.findFirst({
        where: eq(conversationMessages.id, message.id),
        with: {
          conversation: {
            with: {
              mailbox: true,
            },
          },
        },
      });

      expect(email?.conversation.mailbox.id).toBe(mailbox.id);
      expect(email?.conversation.mailbox.gmailSupportEmailId).toBeNull();
    });
  });

  describe("on failure", () => {
    it("returns null when the email is soft-deleted", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
        deletedAt: new Date(),
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).not.toHaveBeenCalled();
      expect(await db.query.conversations.findFirst({ where: eq(conversations.id, conversation.id) })).toMatchObject({
        status: "closed",
      });
      expect(
        await db.query.conversationMessages.findFirst({ where: eq(conversationMessages.id, message.id) }),
      ).toMatchObject({
        status: "queueing",
      });
    });

    it("returns null when the email is not in queueing status", async () => {
      const { conversation } = await setupConversationForResendSending();

      const { message } = await conversationMessagesFactory.create(conversation.id, {
        body: "Content",
        status: "sent", // Already sent
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it("returns null when message doesn't exist", async () => {
      const nonExistentMessageId = 999999;

      expect(await sendEmail({ messageId: nonExistentMessageId })).toBeNull();
      expect(mockResendSend).not.toHaveBeenCalled();
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

      expect(await sendEmail({ messageId: message.id })).toEqual("The conversation emailFrom is missing.");
      await assertMarkFailed(message.id);
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it("marks the email as failed when Resend API key is not configured", async () => {
      const { env } = await import("@/lib/env");
      const originalApiKey = env.RESEND_API_KEY;

      // @ts-expect-error - Modifying mocked env for test
      env.RESEND_API_KEY = null;

      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      expect(await sendEmail({ messageId: message.id })).toEqual(
        "No email sending method configured (Gmail or Resend).",
      );
      await assertMarkFailed(message.id);
      expect(mockResendSend).not.toHaveBeenCalled();

      // @ts-expect-error - Restoring mocked env
      env.RESEND_API_KEY = originalApiKey;
    });

    it("marks the email as failed when Resend from address is not configured", async () => {
      const { env } = await import("@/lib/env");
      const originalFromAddress = env.RESEND_FROM_ADDRESS;

      // @ts-expect-error - Modifying mocked env for test
      env.RESEND_FROM_ADDRESS = null;

      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      expect(await sendEmail({ messageId: message.id })).toEqual(
        "No email sending method configured (Gmail or Resend).",
      );
      await assertMarkFailed(message.id);
      expect(mockResendSend).not.toHaveBeenCalled();

      // @ts-expect-error - Restoring mocked env
      env.RESEND_FROM_ADDRESS = originalFromAddress;
    });

    it("marks the email as failed when both API key and from address are missing", async () => {
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

      expect(await sendEmail({ messageId: message.id })).toEqual(
        "No email sending method configured (Gmail or Resend).",
      );
      await assertMarkFailed(message.id);
      expect(mockResendSend).not.toHaveBeenCalled();

      // @ts-expect-error - Restoring mocked env
      env.RESEND_API_KEY = originalApiKey;
      // @ts-expect-error - Restoring mocked env
      env.RESEND_FROM_ADDRESS = originalFromAddress;
    });

    it("marks the email as failed when Resend returns an API error", async () => {
      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Invalid API key" },
      });

      expect(await sendEmail({ messageId: message.id })).toEqual("Failed to send via Resend: Invalid API key");
      await assertMarkFailed(message.id);
      expect(sentryUtils.captureExceptionAndThrowIfDevelopment).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid API key" }),
      );
    });

    it("marks the email as failed when Resend returns different error types", async () => {
      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      mockResendSend.mockResolvedValueOnce({
        data: null,
        error: { message: "Rate limit exceeded", code: "RATE_LIMIT" },
      });

      expect(await sendEmail({ messageId: message.id })).toEqual("Failed to send via Resend: Rate limit exceeded");
      await assertMarkFailed(message.id);
    });

    it("marks the email as failed when there is an unexpected network error", async () => {
      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      const networkError = new Error("Network timeout");
      mockResendSend.mockRejectedValueOnce(networkError);
      vi.mocked(sentryUtils.captureExceptionAndThrowIfDevelopment).mockImplementation(() => {});

      expect(await sendEmail({ messageId: message.id })).toEqual("Unexpected error: Error: Network timeout");
      await assertMarkFailed(message.id);
      expect(sentryUtils.captureExceptionAndThrowIfDevelopment).toHaveBeenCalledWith(networkError);
    });

    it("marks the email as failed when Resend throws during instantiation", async () => {
      const { conversation } = await setupConversationForResendSending();
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      // Mock Resend constructor to throw
      const ResendError = new Error("Failed to initialize Resend client");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      vi.mocked(require("resend").Resend).mockImplementationOnce(() => {
        throw ResendError;
      });

      vi.mocked(sentryUtils.captureExceptionAndThrowIfDevelopment).mockImplementation(() => {});

      expect(await sendEmail({ messageId: message.id })).toEqual(
        "Unexpected error: Error: Failed to initialize Resend client",
      );
      await assertMarkFailed(message.id);
      expect(sentryUtils.captureExceptionAndThrowIfDevelopment).toHaveBeenCalledWith(ResendError);
    });
  });

  describe("edge cases", () => {
    it("handles very long email subjects correctly", async () => {
      const longSubject = "A".repeat(500); // Very long subject
      const { conversation } = await setupConversationForResendSending();

      await db.update(conversations).set({ subject: longSubject }).where(eq(conversations.id, conversation.id));

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
        role: "staff",
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "customer@example.com",
        subject: `Re: ${longSubject}`,
        react: "Mock AI reply email",
      });
      await assertMarkSent(message.id);
    });

    it("handles special characters in email addresses", async () => {
      const specialEmail = "user+tag@sub.domain-name.co.uk";
      const { conversation } = await setupConversationForResendSending();

      await db.update(conversations).set({ emailFrom: specialEmail }).where(eq(conversations.id, conversation.id));

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
        role: "staff",
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: specialEmail,
        subject: "Re: Conversation subject",
        react: "Mock AI reply email",
      });
      await assertMarkSent(message.id);
    });

    it("handles empty string subjects correctly", async () => {
      const { conversation } = await setupConversationForResendSending();

      await db.update(conversations).set({ subject: "" }).where(eq(conversations.id, conversation.id));

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
        role: "staff",
      });

      expect(await sendEmail({ messageId: message.id })).toBeNull();
      expect(mockResendSend).toHaveBeenCalledWith({
        from: "test@example.com",
        to: "customer@example.com",
        subject: "Reply from Helper",
        react: "Mock AI reply email",
      });
      await assertMarkSent(message.id);
    });
  });
});

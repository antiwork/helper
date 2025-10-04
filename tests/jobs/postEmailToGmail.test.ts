import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm/expressions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations, mailboxes } from "@/db/schema";
import { postEmailToGmail } from "@/jobs/postEmailToGmail";
import { getMessageMetadataById, sendGmailEmail } from "@/lib/gmail/client";
import { convertConversationMessageToRaw } from "@/lib/gmail/lib";
import * as sentryUtils from "@/lib/shared/sentry";

vi.mock("@/lib/emails/automatedRepliesLimitExceeded", () => ({
  default: vi.fn().mockReturnValue("Mock component"),
}));
vi.spyOn(sentryUtils, "captureExceptionAndThrowIfDevelopment");

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock("@/lib/gmail/client", () => ({
  sendGmailEmail: vi.fn().mockImplementation(() => ({
    status: 200,
    data: { id: "sent-gmail-message-id", threadId: "sent-gmail-thread-id" },
  })),
  getMessageMetadataById: vi.fn(),
  getGmailService: vi.fn().mockImplementation(() => "mock client"),
}));

vi.mock("@/lib/gmail/lib", () => ({
  convertConversationMessageToRaw: vi.fn().mockImplementation(() => "mock raw email"),
}));

const setupConversationForGmailSending = async () => {
  const { mailbox } = await userFactory.createRootUser();

  const { conversation } = await conversationFactory.create({
    conversationProvider: "gmail",
    status: "closed",
    subject: "Conversation subject",
    emailFrom: "to@example.com",
  });

  const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
    email: "test@example.com",
    accessToken: "testAccessToken",
    refreshToken: "testRefreshToken",
  });
  const updatedMailbox = await db
    .update(mailboxes)
    .set({ gmailSupportEmailId: gmailSupportEmail.id })
    .where(eq(mailboxes.id, mailbox.id))
    .returning()
    .then(takeUniqueOrThrow);

  return {
    conversation,
    mailbox: { ...updatedMailbox, gmailSupportEmail },
  };
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

describe("postEmailToGmail", () => {
  describe("on success", () => {
    it("properly posts to Gmail", async () => {
      const { conversation } = await setupConversationForGmailSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      const { file: file1 } = await fileFactory.create(null, {
        isInline: true,
        name: "file1.pdf",
        key: "file1.pdf",
        mimetype: "text/plain",
        messageId: message.id,
      });
      const { file: file2 } = await fileFactory.create(null, {
        isInline: false,
        name: "file2.jpg",
        key: "file2.jpg",
        mimetype: "image/jpeg",
        messageId: message.id,
      });

      vi.mocked(getMessageMetadataById).mockResolvedValueOnce({
        data: {
          payload: {
            headers: [
              { name: "Message-ID", value: "<new-message-id@example.com>" },
              { name: "References", value: "<reference1@example.com> <reference2@example.com>" },
            ],
          },
        },
      } as any);

      expect(await postEmailToGmail({ messageId: message.id })).toBeNull();
      expect(convertConversationMessageToRaw).toHaveBeenCalledTimes(1);
      expect(convertConversationMessageToRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          body: message.body,
          conversation: expect.objectContaining({
            id: conversation.id,
            emailFrom: "to@example.com",
          }),
          files: expect.arrayContaining([
            expect.objectContaining({ id: file1.id }),
            expect.objectContaining({ id: file2.id }),
          ]),
        }),
        "test@example.com",
      );
      expect(sendGmailEmail).toHaveBeenCalledTimes(1);
      expect(sendGmailEmail).toHaveBeenCalledWith("mock client", "mock raw email", null);
      await assertMarkSent(message.id);

      const updatedMessage = await db.query.conversationMessages.findFirst({
        where: eq(conversationMessages.id, message.id),
      });
      expect(updatedMessage).toMatchObject({
        gmailMessageId: "sent-gmail-message-id",
        gmailThreadId: "sent-gmail-thread-id",
        messageId: "<new-message-id@example.com>",
        references: "<reference1@example.com> <reference2@example.com>",
      });
    });

    it("includes the correct threadId for reply emails", async () => {
      const { conversation } = await setupConversationForGmailSending();
      await conversationMessagesFactory.create(conversation.id, {
        body: "User email that initiated the conversation",
        role: "user",
        gmailThreadId: "testThreadId",
        gmailMessageId: "testMessageId",
        messageId: "<messageId>",
        references: null,
      });

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      expect(await postEmailToGmail({ messageId: message.id })).toBeNull();
      expect(convertConversationMessageToRaw).toHaveBeenCalledTimes(1);
      expect(convertConversationMessageToRaw).toHaveBeenCalledWith(
        expect.objectContaining({
          body: message.body,
          conversation: expect.objectContaining({
            id: conversation.id,
            emailFrom: "to@example.com",
          }),
          files: [],
        }),
        "test@example.com",
      );
      expect(sendGmailEmail).toHaveBeenCalledTimes(1);
      expect(sendGmailEmail).toHaveBeenCalledWith("mock client", "mock raw email", "testThreadId");
      await assertMarkSent(message.id);
    });
  });

  describe("on failure", () => {
    it("returns null when the email is soft-deleted or not a queueing staff email", async () => {
      const { conversation } = await setupConversationForGmailSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
        deletedAt: new Date(),
      });

      expect(await postEmailToGmail({ messageId: message.id })).toBeNull();
      expect(await db.query.conversations.findFirst({ where: eq(conversations.id, conversation.id) })).toMatchObject({
        status: "closed",
      });
      expect(
        await db.query.conversationMessages.findFirst({ where: eq(conversationMessages.id, message.id) }),
      ).toMatchObject({
        status: "queueing",
      });
    });

    it("marks the email as sent without posting to Gmail when the conversation emailFrom is missing", async () => {
      const { conversation } = await setupConversationForGmailSending();
      const updatedConversation = await db
        .update(conversations)
        .set({ emailFrom: null })
        .where(eq(conversations.id, conversation.id))
        .returning()
        .then(takeUniqueOrThrow);

      const { message } = await conversationMessagesFactory.createEnqueued(updatedConversation.id, {
        body: "Content",
      });
      expect(await postEmailToGmail({ messageId: message.id })).toBeNull();
      expect(convertConversationMessageToRaw).not.toHaveBeenCalled();
      expect(sendGmailEmail).not.toHaveBeenCalled();
      await assertMarkSent(message.id);
    });

    it("marks the email as sent without posting to Gmail when conversation was read after message creation", async () => {
      const { conversation } = await setupConversationForGmailSending();

      const messageCreatedAt = new Date("2025-01-01T12:00:00Z");
      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
        createdAt: messageCreatedAt,
      });

      const lastReadAt = new Date("2025-01-01T13:00:00Z");
      await db.update(conversations).set({ lastReadAt }).where(eq(conversations.id, conversation.id));

      expect(await postEmailToGmail({ messageId: message.id })).toBeNull();
      expect(convertConversationMessageToRaw).not.toHaveBeenCalled();
      expect(sendGmailEmail).not.toHaveBeenCalled();
      await assertMarkSent(message.id);
    });

    it("marks the email as failed when the mailbox does not have a connected Gmail account", async () => {
      const { conversation, mailbox } = await setupConversationForGmailSending();
      await db.update(mailboxes).set({ gmailSupportEmailId: null }).where(eq(mailboxes.id, mailbox.id));

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });
      expect(await postEmailToGmail({ messageId: message.id })).toEqual(
        "The mailbox does not have a connected Gmail account.",
      );
      await assertMarkFailed(message.id);
    });

    it("marks the email as failed when there is an unexpected error", async () => {
      const { conversation } = await setupConversationForGmailSending();

      const { message } = await conversationMessagesFactory.createEnqueued(conversation.id, {
        body: "Content",
      });

      vi.mocked(sendGmailEmail).mockRejectedValueOnce(new Error("RIP"));
      vi.mocked(sentryUtils.captureExceptionAndThrowIfDevelopment).mockImplementation(() => {});

      expect(await postEmailToGmail({ messageId: message.id })).toEqual("Unexpected error: Error: RIP");
      await assertMarkFailed(message.id);
    });
  });
});

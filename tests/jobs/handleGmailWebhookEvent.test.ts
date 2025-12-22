import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { raw as HELPER_MAILBOX_IS_CCED_ONTO_THREAD_RAW } from "@tests/support/fixtures/gmail/helperMailboxIsCcedOntoThread";
import { raw as MULTIPLE_TO_EMAILS_RAW } from "@tests/support/fixtures/gmail/multipleToEmailAddresses";
import { raw as NEW_CONVERSATION_RAW } from "@tests/support/fixtures/gmail/newConversationWithAttachments";
import { raw as WEIRD_ATTACHMENT_RAW } from "@tests/support/fixtures/gmail/weirdAttachment";
import { raw as WEIRD_EMAIL_FROM_RAW } from "@tests/support/fixtures/gmail/weirdEmailFrom";
import { mockJobs, mockTriggerEvent } from "@tests/support/jobsUtils";
import { count, eq } from "drizzle-orm";
import { OAuth2Client } from "google-auth-library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages } from "@/db/schema";
import { generateFilePreview } from "@/jobs/generateFilePreview";
import { handleGmailWebhookEvent } from "@/jobs/handleGmailWebhookEvent";
import { runAIQuery } from "@/lib/ai";
import { uploadFile } from "@/lib/data/files";
import { env } from "@/lib/env";
import { getGmailService, getMessageById, getMessagesFromHistoryId } from "@/lib/gmail/client";

vi.mock("@/lib/gmail/client");
vi.mock("google-auth-library");
vi.mock("@sentry/nextjs", () => ({
  setContext: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@/jobs/generateFilePreview");
vi.mock("@/lib/data/files", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/data/files")>();
  return {
    ...mod,
    uploadFile: vi.fn(),
  };
});
vi.mock("@/lib/ai", () => ({
  runAIQuery: vi.fn(),
}));

mockJobs();

const GMAIL_SUPPORT_EMAIL_ADDRESS = "test@example.com";
const DATA_HISTORY_ID = 2000;
const mockHeaders = () => {
  return {
    // Randomize to assert case-insensitivity
    [Math.random() < 0.5 ? "authorization" : "Authorization"]: "Bearer mock-token",
  };
};
const MOCK_BODY = {
  message: {
    data: Buffer.from(
      JSON.stringify({
        emailAddress: GMAIL_SUPPORT_EMAIL_ADDRESS,
        historyId: DATA_HISTORY_ID,
      }),
    ).toString("base64url"),
    messageId: "123",
    publishTime: "2023-01-01T00:00:00Z",
  },
  subscription: "test-subscription",
};

const mockHistories = (messagesAdded: { message: { id: string; threadId: string; labelIds: string[] } }[]) => {
  vi.mocked(getMessagesFromHistoryId).mockResolvedValue({
    status: 200,
    data: {
      history: [
        {
          messagesAdded,
        },
      ],
    },
  } as any);
};

const mockMessage = (data: Partial<Awaited<ReturnType<typeof getMessageById>>["data"]>) => {
  vi.mocked(getMessageById).mockResolvedValue({
    status: 200,
    data,
  } as any);
};

const setupGmailSupportEmail = async (customerInfoUrl?: string) => {
  const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
    email: GMAIL_SUPPORT_EMAIL_ADDRESS,
    historyId: 1000,
  });
  const { mailbox } = await userFactory.createRootUser({
    mailboxOverrides: {
      gmailSupportEmailId: gmailSupportEmail.id,
      customerInfoUrl: customerInfoUrl || "https://example.com/customer-info",
    },
  });

  return { gmailSupportEmail, mailbox };
};

describe("handleGmailWebhookEvent", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.mocked(OAuth2Client.prototype.verifyIdToken).mockResolvedValue({
      getPayload: () => ({ email: env.GOOGLE_PUBSUB_CLAIM_EMAIL }),
    } as any);
    vi.mocked(getGmailService).mockReturnValue({} as any);
    vi.mocked(generateFilePreview);
    vi.mocked(uploadFile).mockResolvedValue("mocked-path");
    vi.mocked(runAIQuery).mockResolvedValue({ text: "no" } as any);
  });

  describe("unhappy paths", () => {
    it("falls back to the historyId in the Gmail request if the Gmail support email record historyId is expired", async () => {
      const { gmailSupportEmail } = await setupGmailSupportEmail();

      vi.mocked(getMessagesFromHistoryId).mockImplementation((_, historyId) => {
        if (historyId === gmailSupportEmail.historyId?.toString()) {
          return Promise.resolve({ status: 404, data: {} } as any);
        }
        return Promise.resolve({
          status: 200,
          data: {
            history: [
              {
                messagesAdded: [
                  {
                    message: {
                      id: "threadId",
                      threadId: "threadId",
                      labelIds: ["INBOX"],
                    },
                  },
                ],
              },
            ],
          },
        } as any);
      });

      mockMessage({
        raw: Buffer.from(
          "From: sender@example.com\r\nSubject: Test Email\r\nMessage-ID: <unique-message-id@example.com>\r\n\r\nThis is the email body",
        ).toString("base64url"),
      });

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const updatedGmailSupportEmail = await db.query.gmailSupportEmails.findFirst({
        where: (g, { eq }) => eq(g.id, gmailSupportEmail.id),
      });
      expect(updatedGmailSupportEmail?.historyId).toBe(DATA_HISTORY_ID);
    });

    it("errors if the Gmail authorization fails", async () => {
      await setupGmailSupportEmail();

      vi.mocked(OAuth2Client.prototype.verifyIdToken).mockRejectedValue(new Error("Authorization failed"));

      await expect(handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() })).rejects.toThrow(
        "Invalid token",
      );
    });

    it("short-circuits if the gmailSupportEmail is not found", async () => {
      await expect(handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() })).resolves.not.toThrow();

      expect(getMessagesFromHistoryId).not.toHaveBeenCalled();
      expect(getMessageById).not.toHaveBeenCalled();
    });

    it("skips emails that already exist in the conversation", async () => {
      const { conversation } = await conversationFactory.create({
        conversationProvider: "gmail",
      });
      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
        gmailMessageId: "existingMessageId",
        gmailThreadId: "existingThreadId",
      });

      mockHistories([
        {
          message: {
            id: "existingMessageId",
            threadId: "existingThreadId",
            labelIds: ["INBOX"],
          },
        },
      ]);

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      expect(getMessageById).not.toHaveBeenCalled();
    });

    it("does not process emails sent from the mailbox", async () => {
      const { gmailSupportEmail } = await setupGmailSupportEmail();

      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["SENT"],
          },
        },
      ]);
      mockMessage({
        raw: Buffer.from(
          `From: ${gmailSupportEmail.email}\r\nSubject: Test Email\r\nMessage-ID: <unique-message-id@example.com>\r\n\r\nThis is the email body`,
        ).toString("base64url"),
      });

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toBeUndefined();
    });

    it("does not generate a response for ignored Gmail categories", async () => {
      await setupGmailSupportEmail();
      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["CATEGORY_PROMOTIONS"],
          },
        },
      ]);
      mockMessage({
        raw: Buffer.from("From: test@gmail.com\r\nSubject: Your order confirmation\r\n\r\nThis is an email").toString(
          "base64url",
        ),
      });
      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });
      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        status: "closed",
      });

      const event = await db.query.conversationEvents.findFirst({
        where: eq(conversationEvents.conversationId, conversation!.id),
      });
      expect(event).toMatchObject({
        type: "email_auto_ignored",
        changes: { status: "closed" },
        reason: "Message is in an ignored category (CATEGORY_PROMOTIONS)",
      });
    });

    it("does not generate a response for transactional emails", async () => {
      await setupGmailSupportEmail();
      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage({
        raw: Buffer.from(
          "From: noreply@example.com\r\nSubject: Your order confirmation\r\nMessage-ID: <unique-message-id@example.com>\r\n\r\nThis is a transactional email",
        ).toString("base64url"),
      });

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        status: "closed",
      });

      const event = await db.query.conversationEvents.findFirst({
        where: eq(conversationEvents.conversationId, conversation!.id),
      });
      expect(event).toMatchObject({
        type: "email_auto_ignored",
        changes: { status: "closed" },
        reason: "Email address is transactional (noreply@example.com)",
      });
    });

    it("short-circuits if the Gmail support email record is not found", async () => {
      const result = await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      expect(result).toBe(`Valid gmail support email record not found for ${GMAIL_SUPPORT_EMAIL_ADDRESS}`);
      expect(getMessagesFromHistoryId).not.toHaveBeenCalled();
      expect(getMessageById).not.toHaveBeenCalled();
      expect(generateFilePreview).not.toHaveBeenCalled();
      expect(uploadFile).not.toHaveBeenCalled();
    });
  });

  describe("happy paths", () => {
    it("creates a conversation and email record for the first email in a Gmail thread", async () => {
      const testCustomerInfoUrl = "https://test-customer-info.com/customers";
      const { gmailSupportEmail } = await setupGmailSupportEmail(testCustomerInfoUrl);
      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage({
        raw: Buffer.from(
          "From: sender@example.com\r\nSubject: Test Email\r\nMessage-ID: <unique-message-id@example.com>\r\n\r\nThis is the email body",
        ).toString("base64url"),
      });

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        emailFrom: "sender@example.com",
        subject: "Test Email",
        status: "open",
        conversationProvider: "gmail",
      });

      const message = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation!.id),
      });
      expect(message).toMatchObject({
        emailFrom: "sender@example.com",
        body: "<p>This is the email body</p>",
        cleanedUpText: "This is the email body",
        role: "user",
        gmailMessageId: "threadId",
        gmailThreadId: "threadId",
        messageId: "<unique-message-id@example.com>",
        references: null,
        conversationId: conversation!.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });

      const updatedGmailSupportEmail = await db.query.gmailSupportEmails.findFirst({
        where: (g, { eq }) => eq(g.id, gmailSupportEmail.id),
      });
      expect(updatedGmailSupportEmail?.historyId).toBe(DATA_HISTORY_ID);

      expect(mockTriggerEvent).toHaveBeenCalledWith("conversations/auto-response.create", {
        messageId: message!.id,
        customerInfoUrl: testCustomerInfoUrl,
      });
    });

    it("creates a conversation and email record even if the email is not the first in the Gmail thread", async () => {
      const { gmailSupportEmail } = await setupGmailSupportEmail();

      mockHistories([
        {
          message: {
            id: "gmailMessageId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage({
        raw: Buffer.from(
          "From: sender@example.com\r\nSubject: Test Email\r\nMessage-ID: <unique-message-id@example.com>\r\n\r\nThis is the email body",
        ).toString("base64url"),
      });

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        emailFrom: "sender@example.com",
        subject: "Test Email",
        status: "open",
        conversationProvider: "gmail",
      });

      const message = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation!.id),
      });
      expect(message).toMatchObject({
        emailFrom: "sender@example.com",
        body: "<p>This is the email body</p>",
        cleanedUpText: "This is the email body",
        role: "user",
        gmailMessageId: "gmailMessageId",
        gmailThreadId: "threadId",
        messageId: "<unique-message-id@example.com>",
        references: null,
        conversationId: conversation!.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });

      const updatedGmailSupportEmail = await db.query.gmailSupportEmails.findFirst({
        where: (g, { eq }) => eq(g.id, gmailSupportEmail.id),
      });
      expect(updatedGmailSupportEmail?.historyId).toBe(DATA_HISTORY_ID);
    });

    it("creates an email record for a new email on an existing Gmail thread", async () => {
      await setupGmailSupportEmail();
      const { conversation } = await conversationFactory.create({
        conversationProvider: "gmail",
        status: "closed",
      });
      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
        gmailThreadId: "existingThreadId",
      });

      mockHistories([
        {
          message: {
            id: "gmailMessageId",
            threadId: "existingThreadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage({
        raw: Buffer.from(
          "From: sender@example.com\r\nSubject: Test Email\r\nMessage-ID: <unique-message-id@example.com>\r\n\r\nThis is the email body",
        ).toString("base64url"),
      });

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      expect(
        await db.query.conversations.findFirst({
          where: (c, { ne }) => ne(c.id, conversation.id),
        }),
      ).toBeUndefined();

      expect(
        await db
          .select({ count: count() })
          .from(conversationMessages)
          .where(eq(conversationMessages.conversationId, conversation.id)),
      ).toEqual([{ count: 2 }]);

      const updatedMessage = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation.id),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
      });
      expect(updatedMessage).toMatchObject({
        emailFrom: "sender@example.com",
        body: "<p>This is the email body</p>",
        cleanedUpText: "This is the email body",
        role: "user",
        gmailMessageId: "gmailMessageId",
        gmailThreadId: "existingThreadId",
        messageId: "<unique-message-id@example.com>",
        references: null,
        conversationId: conversation.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });
    });

    it("keeps conversation open when email is from a staff user (first message)", async () => {
      await setupGmailSupportEmail();
      const { user: staffUser } = await userFactory.createUser();

      // Mock a history with only one message to simulate a first message
      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage({
        raw: Buffer.from(
          `From: ${staffUser.email}\r\nSubject: Test Email\r\nMessage-ID: <unique-message-id@example.com>\r\n\r\nThis is the email body`,
        ).toString("base64url"),
      });

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        status: "open",
      });
    });
  });

  describe("complex cases", () => {
    it("handles when the mailbox is CC'ed onto a Gmail thread", async () => {
      await setupGmailSupportEmail();

      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage(HELPER_MAILBOX_IS_CCED_ONTO_THREAD_RAW);

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        emailFrom: "helperai123@gmail.com",
        emailFromName: "Helper Support",
        subject: "Re: An email sent directly to helperai123@gmail.com",
        status: "open",
        conversationProvider: "gmail",
      });

      const message = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation!.id),
      });
      expect(message).toMatchObject({
        emailFrom: "helperai123@gmail.com",
        emailCc: ["shan124.development@gmail.com"],
        emailTo: '"Shan Rauf" <s.rauf124@gmail.com>',
        body: '<div dir="ltr">Looping in my helper shan124.development to answer your question!<br><br>Best,<br>helperai123</div><br><div class="gmail_quote"><div dir="ltr" class="gmail_attr">On Sun, Aug 4, 2024 at 1:34 PM Shan Rauf &lt;<a href="mailto:s.rauf124@gmail.com">s.rauf124@gmail.com</a>&gt; wrote:<br></div><blockquote class="gmail_quote" style="margin:0px 0px 0px 0.8ex;border-left:1px solid rgb(204,204,204);padding-left:1ex"><div dir="ltr">I have a question!<br><br>Regards,<br>s.rauf124</div>\n</blockquote></div>\n',
        cleanedUpText:
          "Looping in my helper shan124.development to answer your question!\n\nBest,\nhelperai123\n\nOn Sun, Aug 4, 2024 at 1:34 PM Shan Rauf <s.rauf124@gmail.com\n[s.rauf124@gmail.com]> wrote:\n\n> I have a question!\n> \n> Regards,\n> s.rauf124",
        role: "user",
        gmailMessageId: "threadId",
        gmailThreadId: "threadId",
        messageId: "<CAE7BnJEm0ioPckUuEGHnx6zP4wBZC8L_-nbu7nmyKjjqKgXMSg@mail.gmail.com>",
        references: "<CAD-uRDWWimtaexOui_aShbQQtpam2fGfv0QqvubQQ7WqRV1DpA@mail.gmail.com>",
        conversationId: conversation!.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });
    });

    it("handles when there are multiple 'To' email addresses", async () => {
      await setupGmailSupportEmail();

      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage(MULTIPLE_TO_EMAILS_RAW);

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        emailFrom: "s.rauf124@gmail.com",
        emailFromName: "Shan Rauf",
        subject: 'An email with multiple email addresses in "To"',
        status: "open",
        conversationProvider: "gmail",
      });

      const message = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation!.id),
      });
      expect(message).toMatchObject({
        emailFrom: "s.rauf124@gmail.com",
        emailTo: 'shan124.development@gmail.com, "Helper Support" <helperai123@gmail.com>',
        emailCc: null,
        body: '<div dir="ltr">Email message content,<br><br>Best,<br>Shan</div>\n',
        cleanedUpText: "Email message content,\n\nBest,\nShan",
        role: "user",
        gmailMessageId: "threadId",
        gmailThreadId: "threadId",
        messageId: "<CAD-uRDUKHU6u=GekTpkDkmS6SgAYB6wgSfqUvmbbNDBac3WQkQ@mail.gmail.com>",
        references: null,
        conversationId: conversation!.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });
    });

    it("handles an email with attachments", async () => {
      await setupGmailSupportEmail();

      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage(NEW_CONVERSATION_RAW);

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();
      expect(conversation).toMatchObject({
        emailFrom: "s.rauf124@gmail.com",
        emailFromName: "Shan Rauf",
        subject:
          "A completely new conversation: It’s 綺麗!! And it also happens to have a very long subject line because I want to test and make sure that things work even if the subject line is insanely long!!",
        status: "open",
        conversationProvider: "gmail",
      });

      const message = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation!.id),
      });
      expect(message).toMatchObject({
        emailFrom: "s.rauf124@gmail.com",
        emailTo: "shan124.development@gmail.com",
        emailCc: ["helperai123@gmail.com"],
        body: '<div dir="ltr">新しい message!&nbsp;<br><br>Best,<br>Shan :D</div>\n',
        cleanedUpText: "新しい message! \n\nBest,\nShan :D",
        role: "user",
        gmailMessageId: "threadId",
        gmailThreadId: "threadId",
        messageId: "<CAD-uRDV0tJqNzJdyEqA63Xf0u7_XkvNaCiK5bcSKuLt-Oct01A@mail.gmail.com>",
        references: null,
        conversationId: conversation!.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });

      const attachedFiles = await db.query.files.findMany({
        where: (f, { eq }) => eq(f.messageId, message!.id),
      });
      expect(attachedFiles).toHaveLength(3);
      expect(generateFilePreview).toHaveBeenCalledTimes(3);
      expect(uploadFile).toHaveBeenCalledTimes(3);

      attachedFiles.forEach((file) => {
        expect(generateFilePreview).toHaveBeenCalledWith({ fileId: file.id });
        expect(uploadFile).toHaveBeenCalledWith(file.key, expect.anything(), { mimetype: file.mimetype });
      });
    });

    it("handles a weird attachment", async () => {
      await setupGmailSupportEmail();

      mockHistories([
        {
          message: {
            id: "threadId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage(WEIRD_ATTACHMENT_RAW);

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();

      const message = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation!.id),
      });
      expect(conversation).toMatchObject({
        emailFrom: "from@gmail.com",
        emailFromName: null,
        subject: '"Org" has been accepted by from@gmail.com',
        status: "open",
        conversationProvider: "gmail",
      });

      expect(message).toMatchObject({
        emailFrom: "from@gmail.com",
        emailTo: '"To Name" <to@gmail.com>',
        emailCc: null,
        body: '<p><a href="mailto:from@gmail.com">from@gmail.com</a> has accepted the invitation to the following event:</p><p>*Org*</p><p>When: 2024-07-23 14:00 - 14:30 (Asia/Jakarta)</p><p>Invitees: To Name &lt;<a href="mailto:to@gmail.com">to@gmail.com</a>&gt;,<br> <a href="mailto:invitee@gmail.com">invitee@gmail.com</a> &lt;<a href="mailto:invitee@gmail.com">invitee@gmail.com</a>&gt;,<br> <a href="mailto:invitee2@gmail.com">invitee2@gmail.com</a> &lt;<a href="mailto:invitee2@gmail.com">invitee2@gmail.com</a>&gt;,<br> <a href="mailto:invitee3@gmail.com">invitee3@gmail.com</a> &lt;<a href="mailto:invitee3@gmail.com">invitee3@gmail.com</a>&gt;,<br> <a href="mailto:from@gmail.com">from@gmail.com</a> &lt;<a href="mailto:from@gmail.com">from@gmail.com</a>&gt;</p>',
        cleanedUpText:
          "from@gmail.com [from@gmail.com] has accepted the invitation to the following\nevent:\n\n*Org*\n\nWhen: 2024-07-23 14:00 - 14:30 (Asia/Jakarta)\n\nInvitees: To Name <to@gmail.com [to@gmail.com]>,\ninvitee@gmail.com [invitee@gmail.com] <invitee@gmail.com [invitee@gmail.com]>,\ninvitee2@gmail.com [invitee2@gmail.com] <invitee2@gmail.com\n[invitee2@gmail.com]>,\ninvitee3@gmail.com [invitee3@gmail.com] <invitee3@gmail.com\n[invitee3@gmail.com]>,\nfrom@gmail.com [from@gmail.com] <from@gmail.com [from@gmail.com]>",
        role: "user",
        gmailMessageId: "threadId",
        gmailThreadId: "threadId",
        messageId: "<f938j4a98jfoj3fu834@domain.com>",
        references: null,
        conversationId: conversation!.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });

      const attachedFiles = await db.query.files.findMany({
        where: (f, { eq }) => eq(f.messageId, message!.id),
      });
      expect(attachedFiles).toHaveLength(1);
      expect(generateFilePreview).toHaveBeenCalledTimes(1);
      expect(uploadFile).toHaveBeenCalledTimes(1);

      attachedFiles.forEach((file) => {
        expect(generateFilePreview).toHaveBeenCalledWith({ fileId: file.id });
        expect(uploadFile).toHaveBeenCalledWith(file.key, expect.anything(), { mimetype: file.mimetype });
      });
    });

    it("handles a weird email 'From'", async () => {
      await setupGmailSupportEmail();

      mockHistories([
        {
          message: {
            id: "gmailMessageId",
            threadId: "threadId",
            labelIds: ["INBOX"],
          },
        },
      ]);
      mockMessage(WEIRD_EMAIL_FROM_RAW);

      await handleGmailWebhookEvent({ body: MOCK_BODY, headers: mockHeaders() });

      const conversation = await db.query.conversations.findFirst();

      const message = await db.query.conversationMessages.findFirst({
        where: (m, { eq }) => eq(m.conversationId, conversation!.id),
      });
      expect(conversation).toMatchObject({
        emailFrom: "from@custom_domain.org",
        emailFromName: "'AGIL Pädagogik, Getäve'",
        subject: "<a subject>",
        status: "open",
        conversationProvider: "gmail",
      });

      expect(message).toMatchObject({
        emailFrom: "from@custom_domain.org",
        emailTo: '"Email Name" <to@custom_domain.org>',
        emailCc: null,
        body: "omitted body\n",
        cleanedUpText: "omitted body",
        role: "user",
        gmailMessageId: "gmailMessageId",
        gmailThreadId: "threadId",
        messageId: "<12.A1.11111.AB111A22@aab13mail05>",
        references: null,
        conversationId: conversation!.id,
        isPerfect: false,
        isPinned: false,
        isFlaggedAsBad: false,
      });

      expect(generateFilePreview).not.toHaveBeenCalled();
      expect(uploadFile).not.toHaveBeenCalled();
    });
  });
});

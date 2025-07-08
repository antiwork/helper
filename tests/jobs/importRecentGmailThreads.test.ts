import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { getNewGmailThreads, processGmailThread } from "@/jobs/importRecentGmailThreads";
import { getGmailService, getLast10GmailThreads, getMessageById, getThread } from "@/lib/gmail/client";

vi.mock("@/lib/gmail/client");
vi.mock("@sentry/nextjs");

mockJobs();

const GMAIL_SUPPORT_EMAIL_ADDRESS = "test@example.com";
const GMAIL_THREAD_ID = "thread123";

const setupGmailSupportEmail = async () => {
  const { gmailSupportEmail } = await gmailSupportEmailFactory.create({
    email: GMAIL_SUPPORT_EMAIL_ADDRESS,
    historyId: 1000,
  });
  const { mailbox } = await userFactory.createRootUser({
    mailboxOverrides: { gmailSupportEmailId: gmailSupportEmail.id },
  });

  return { gmailSupportEmail, mailbox };
};

describe("getNewGmailThreads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getGmailService).mockReturnValue({} as any);
  });

  it("returns new Gmail threads", async () => {
    const { gmailSupportEmail } = await setupGmailSupportEmail();

    const mockThreads = [
      { id: "thread1", historyId: "1001" },
      { id: "thread2", historyId: "1002" },
      { id: "thread3", historyId: "1003" },
    ];

    vi.mocked(getLast10GmailThreads).mockResolvedValue({
      status: 200,
      data: { threads: mockThreads },
    } as any);

    const { conversation } = await conversationFactory.create({
      conversationProvider: "gmail",
    });
    await conversationMessagesFactory.create(conversation.id, {
      gmailThreadId: "thread3",
    });

    const result = await getNewGmailThreads(gmailSupportEmail.id);

    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: "thread1", historyId: "1001" },
      { id: "thread2", historyId: "1002" },
    ]);

    expect(getLast10GmailThreads).toHaveBeenCalledTimes(1);
    expect(getGmailService).toHaveBeenCalledWith(gmailSupportEmail);
  });
});

describe("processGmailThread", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getGmailService).mockReturnValue({} as any);
  });

  it("processes a Gmail thread and creates a conversation with messages", async () => {
    const { gmailSupportEmail } = await setupGmailSupportEmail();

    const message1Date = new Date("2023-05-01T10:00:00Z");
    const message2Date = new Date("2023-05-01T11:00:00Z");

    vi.mocked(getThread).mockResolvedValue({
      data: {
        messages: [
          {
            id: GMAIL_THREAD_ID,
            payload: {
              headers: [
                { name: "From", value: "sender@example.com" },
                { name: "Subject", value: "Test Subject" },
                { name: "Date", value: message1Date.toUTCString() },
              ],
            },
          },
          {
            id: "message2",
            payload: {
              headers: [{ name: "Date", value: message2Date.toUTCString() }],
            },
          },
        ],
      },
    } as any);

    vi.mocked(getMessageById).mockImplementation((_, messageId) => {
      const rawEmail =
        messageId === GMAIL_THREAD_ID
          ? `From: sender@example.com\r\nSubject: Test Subject\r\nMessage-ID: <message1@example.com>\r\nDate: ${message1Date.toUTCString()}\r\n\r\nEmail content 1`
          : `From: sender@example.com\r\nSubject: Re: Test Subject\r\nMessage-ID: <message2@example.com>\r\nReferences: <message1@example.com>\r\nDate: ${message2Date.toUTCString()}\r\n\r\nEmail content 2`;

      return Promise.resolve({
        status: 200,
        data: {
          id: messageId,
          raw: Buffer.from(rawEmail).toString("base64url"),
        },
      } as any);
    });

    const result = assertDefined(await processGmailThread(gmailSupportEmail.id, GMAIL_THREAD_ID));

    const conversation = await db.query.conversations
      .findFirst({
        where: eq(conversations.emailFrom, "sender@example.com"),
      })
      .then(assertDefined);

    expect(result).toEqual({
      gmailThreadId: GMAIL_THREAD_ID,
      lastUserEmailCreatedAt: message2Date,
      conversationId: conversation.id,
      conversationSlug: conversation.slug,
    });

    expect(conversation).toMatchObject({
      emailFrom: "sender@example.com",
      emailFromName: null,
      subject: "Test Subject",
      status: "open",
      conversationProvider: "gmail",
      lastUserEmailCreatedAt: message2Date,
    });

    const messages = await db.query.conversationMessages.findMany({
      where: eq(conversationMessages.conversationId, assertDefined(result.conversationId)),
      orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    expect(messages).toHaveLength(2);

    expect(messages[0]).toMatchObject({
      role: "user",
      gmailMessageId: GMAIL_THREAD_ID,
      gmailThreadId: GMAIL_THREAD_ID,
      messageId: "<message1@example.com>",
      references: null,
      emailFrom: "sender@example.com",
      body: "<p>Email content 1</p>",
      cleanedUpText: "Email content 1",
      createdAt: message1Date,
    });

    expect(messages[1]).toMatchObject({
      role: "user",
      gmailMessageId: "message2",
      gmailThreadId: GMAIL_THREAD_ID,
      messageId: "<message2@example.com>",
      references: "<message1@example.com>",
      emailFrom: "sender@example.com",
      body: "<p>Email content 2</p>",
      cleanedUpText: "Email content 2",
      createdAt: message2Date,
    });
  });
});

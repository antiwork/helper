import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { gmailSupportEmailFactory } from "@tests/support/factories/gmailSupportEmails";
import { userFactory } from "@tests/support/factories/users";
import { mockJobs } from "@tests/support/jobsUtils";
import { addDays } from "date-fns";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { generateStartDates, processGmailThreads } from "@/jobs/importGmailThreads";
import { processGmailThreadWithClient } from "@/jobs/importRecentGmailThreads";
import { createConversationEmbedding } from "@/lib/ai/conversationEmbedding";
import { getGmailService, listGmailThreads } from "@/lib/gmail/client";

vi.mock("@/lib/gmail/client");
vi.mock("@/jobs/importRecentGmailThreads", async (importOriginal) => {
  const originalModule = await importOriginal<typeof import("@/jobs/importRecentGmailThreads")>();
  return {
    ...originalModule,
    processGmailThreadWithClient: vi.fn(),
  };
});
vi.mock("@/lib/ai/conversationEmbedding");

mockJobs();

describe("generateStartDates", () => {
  it("generates correct start dates for a given range", () => {
    const startDate = new Date("2023-01-01T00:00:00.000Z");
    const endDate = new Date("2023-01-22T00:00:00.000Z");

    const result = generateStartDates(startDate, endDate);

    expect(result).toEqual([
      new Date("2023-01-01T00:00:00.000Z"),
      new Date("2023-01-08T00:00:00.000Z"),
      new Date("2023-01-15T00:00:00.000Z"),
      new Date("2023-01-22T00:00:00.000Z"),
    ]);
  });

  it("respects the MAX_WEEKS limit", () => {
    const startDate = new Date("2023-01-01T00:00:00.000Z");
    const endDate = new Date("2025-01-01T00:00:00.000Z");

    const result = generateStartDates(startDate, endDate);

    expect(result.length).toBe(52);
    expect(result[0]).toEqual(startDate);
    expect(result[result.length - 1]).toEqual(addDays(startDate, 51 * 7));
  });

  it("handles start date after end date", () => {
    const startDate = new Date("2023-01-22T00:00:00.000Z");
    const endDate = new Date("2023-01-01T00:00:00.000Z");

    const result = generateStartDates(startDate, endDate);

    expect(result).toEqual([]);
  });

  it("handles same start and end date", () => {
    const date = new Date("2023-01-01T00:00:00.000Z");

    const result = generateStartDates(date, date);

    expect(result).toEqual([date]);
  });

  it("generates only one date when the range is less than a week", () => {
    const startDate = new Date("2023-01-01T00:00:00.000Z");
    const endDate = new Date("2023-01-06T00:00:00.000Z");

    const result = generateStartDates(startDate, endDate);

    expect(result).toEqual([startDate]);
  });

  it("handles 8 days", () => {
    const startDate = new Date("2023-01-01T00:00:00.000Z");
    const endDate = new Date("2023-01-08T00:00:00.000Z");

    const result = generateStartDates(startDate, endDate);

    expect(result).toEqual([startDate, endDate]);
  });
});

describe("processGmailThreads", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getGmailService).mockReturnValue({} as any);
  });

  it("processes Gmail threads for a given (max) 7-day period", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { gmailSupportEmail } = await gmailSupportEmailFactory.create();
    await db
      .update(mailboxes)
      .set({
        gmailSupportEmailId: gmailSupportEmail.id,
      })
      .where(eq(mailboxes.id, mailbox.id));

    const weekStartDate = new Date("2023-05-01T00:00:00.000Z");
    const endDate = new Date("2023-05-10T00:00:00.000Z");

    const { conversation } = await conversationFactory.create();
    await conversationMessagesFactory.create(conversation.id, { gmailThreadId: "existing-thread" });

    const mockThreads = [
      { id: "thread1" },
      { id: "thread2" },
      { id: "thread3" },
      { id: "thread4" },
      { id: "thread5" },
      { id: "thread6" },
      { id: "existing-thread" },
    ];

    vi.mocked(listGmailThreads).mockResolvedValue({
      status: 200,
      data: { threads: mockThreads },
    } as any);

    vi.mocked(processGmailThreadWithClient).mockResolvedValue({
      conversationId: 123,
    } as any);

    await processGmailThreads(gmailSupportEmail.id, weekStartDate, endDate);

    expect(getGmailService).toHaveBeenCalledWith(gmailSupportEmail);
    expect(listGmailThreads).toHaveBeenCalledWith(expect.anything(), {
      maxResults: 500,
      q: "after:1682899200 before:1683590400",
      includeSpamTrash: false,
    });

    expect(processGmailThreadWithClient).toHaveBeenCalledTimes(6);
    mockThreads
      .filter((thread) => thread.id !== "existing-thread")
      .forEach((thread) => {
        expect(processGmailThreadWithClient).toHaveBeenCalledWith(expect.anything(), gmailSupportEmail, thread.id, {
          status: "closed",
        });
      });

    expect(createConversationEmbedding).toHaveBeenCalledTimes(6);
    expect(createConversationEmbedding).toHaveBeenCalledWith(123);
  });
});

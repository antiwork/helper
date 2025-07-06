import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { mockJobs } from "@tests/support/jobsUtils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { handleAutoResponse } from "@/jobs/handleAutoResponse";
import * as aiChat from "@/lib/ai/chat";
import * as platformCustomer from "@/lib/data/platformCustomer";
import * as retrieval from "@/lib/data/retrieval";

vi.mock("@/lib/ai/chat");
vi.mock("@/lib/data/retrieval");
vi.mock("@/lib/data/platformCustomer");
vi.mock("@sentry/nextjs", () => ({
  setContext: vi.fn(),
  captureException: vi.fn(),
}));

mockJobs();

describe("handleAutoResponse", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(aiChat.generateDraftResponse).mockResolvedValue({ id: 1 } as any);
    vi.mocked(aiChat.respondWithAI).mockImplementation(async ({ onResponse }: any) => {
      if (onResponse) {
        await onResponse({ platformCustomer: null, humanSupportRequested: false });
      }
      return {
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValueOnce({ done: false }).mockResolvedValueOnce({ done: true }),
          }),
        },
      } as any;
    });
    vi.mocked(retrieval.fetchMetadata).mockResolvedValue(null);
    vi.spyOn(platformCustomer, "upsertPlatformCustomer").mockResolvedValue({} as any);
  });

  it("generates a draft response when autoRespondEmailToChat is 'draft'", async () => {
    const { mailbox } = await mailboxFactory.create({ preferences: { autoRespondEmailToChat: "draft" } });
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToAI: true });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    const result = await handleAutoResponse({ messageId: message.id });

    expect(aiChat.generateDraftResponse).toHaveBeenCalledWith(
      conversation.id,
      expect.objectContaining({ id: mailbox.id }),
    );
    expect(result).toEqual({ message: "Draft response generated", draftId: 1 });
  });

  it("sends an auto-response when autoRespondEmailToChat is not 'draft'", async () => {
    const { mailbox } = await mailboxFactory.create({ preferences: { autoRespondEmailToChat: "reply" } });
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToAI: true });
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Test email body",
    });

    const result = await handleAutoResponse({ messageId: message.id });

    expect(aiChat.respondWithAI).toHaveBeenCalled();
    expect(result).toEqual({ message: "Auto response sent", messageId: message.id });

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(updatedConversation?.status).toBe("closed");
  });

  it("fetches and stores customer metadata and upsert platform customer if emailFrom is present", async () => {
    const mockMetadata = { metadata: { key: "value" } };
    vi.mocked(retrieval.fetchMetadata).mockResolvedValue(mockMetadata as any);
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToAI: true });
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      emailFrom: "customer@example.com",
      body: "Test email body",
    });

    await handleAutoResponse({ messageId: message.id });

    expect(retrieval.fetchMetadata).toHaveBeenCalledWith("customer@example.com");
    const updatedMessage = await db.query.conversationMessages.findFirst({
      where: eq(conversationMessages.id, message.id),
    });
    expect(updatedMessage?.metadata).toEqual(mockMetadata);
    expect(platformCustomer.upsertPlatformCustomer).toHaveBeenCalledWith({
      email: "customer@example.com",
      mailboxId: mailbox.id,
      customerMetadata: mockMetadata.metadata,
    });
  });

  it("skips if conversation is spam", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create(mailbox.id, { status: "spam" });
    const { message } = await conversationMessagesFactory.create(conversation.id);

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - conversation is spam" });
    expect(aiChat.generateDraftResponse).not.toHaveBeenCalled();
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("skips if message is from staff", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "staff" });

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - message is from staff" });
    expect(aiChat.generateDraftResponse).not.toHaveBeenCalled();
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("skips if not assigned to AI", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToAI: false });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - not assigned to AI" });
    expect(aiChat.generateDraftResponse).not.toHaveBeenCalled();
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("skips if email text is empty after cleaning", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create(mailbox.id, { assignedToAI: true, subject: "" });
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "  ",
      cleanedUpText: " ",
    });

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - email text is empty" });
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });
});

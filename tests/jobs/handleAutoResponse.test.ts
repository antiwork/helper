import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { mockJobs } from "@tests/support/jobsUtils";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { handleAutoResponse } from "@/jobs/handleAutoResponse";
import * as aiChat from "@/lib/ai/chat";
import * as platformCustomer from "@/lib/data/platformCustomer";

vi.mock("@/lib/ai/chat");
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
    vi.spyOn(platformCustomer, "upsertPlatformCustomer").mockResolvedValue({} as any);
  });

  it("generates a draft response when autoRespondEmailToChat is 'draft'", async () => {
    const { mailbox } = await mailboxFactory.create({ preferences: { autoRespondEmailToChat: "draft" } });
    const { conversation } = await conversationFactory.create({ assignedToAI: true });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    const result = await handleAutoResponse({ messageId: message.id });

    expect(aiChat.generateDraftResponse).toHaveBeenCalledWith(
      conversation.id,
      expect.objectContaining({ id: mailbox.id }),
      undefined,
    );
    expect(result).toEqual({ message: "Draft response generated", draftId: 1 });
  });

  it("sends an auto-response when autoRespondEmailToChat is not 'draft'", async () => {
    await mailboxFactory.create({ preferences: { autoRespondEmailToChat: "reply" } });
    const { conversation } = await conversationFactory.create({ assignedToAI: true });
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

  it("skips if conversation is spam", async () => {
    const { conversation } = await conversationFactory.create({ status: "spam" });
    const { message } = await conversationMessagesFactory.create(conversation.id);

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - conversation is spam" });
    expect(aiChat.generateDraftResponse).not.toHaveBeenCalled();
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("skips if message is from staff", async () => {
    const { conversation } = await conversationFactory.create();
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "staff" });

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - message is from staff" });
    expect(aiChat.generateDraftResponse).not.toHaveBeenCalled();
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("skips if not assigned to AI", async () => {
    await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({ assignedToAI: false });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - not assigned to AI" });
    expect(aiChat.generateDraftResponse).not.toHaveBeenCalled();
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("ensures the conversation is open when it's not assigned to AI", async () => {
    await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({ assignedToAI: false, status: "closed" });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - not assigned to AI" });

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(updatedConversation?.status).toBe("open");
  });

  it("skips if email text is empty after cleaning", async () => {
    await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({ assignedToAI: true, subject: "" });
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "  ",
      cleanedUpText: " ",
    });

    const result = await handleAutoResponse({ messageId: message.id });
    expect(result).toEqual({ message: "Skipped - email text is empty" });
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("skips if newer message exists in the same conversation", async () => {
    await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({ assignedToAI: true });
    const oldTimestamp = new Date("2024-01-01T10:00:00Z");
    const newTimestamp = new Date("2024-01-01T10:01:00Z");

    const { message: oldMessage } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "First message",
      createdAt: oldTimestamp,
    });

    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Newer message",
      createdAt: newTimestamp,
    });

    const result = await handleAutoResponse({ messageId: oldMessage.id });
    expect(result).toEqual({ message: "Skipped - newer message exists" });
    expect(aiChat.generateDraftResponse).not.toHaveBeenCalled();
    expect(aiChat.respondWithAI).not.toHaveBeenCalled();
  });

  it("sets conversation to open when AI response times out", async () => {
    await mailboxFactory.create({ preferences: { autoRespondEmailToChat: "reply" } });
    const { conversation } = await conversationFactory.create({ assignedToAI: true });
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      body: "Test email body",
    });

    vi.mocked(aiChat.respondWithAI).mockImplementation(
      () => new Promise(() => {}), // Never resolves
    );

    const result = await handleAutoResponse({ messageId: message.id, responseTimeoutMs: 10 });

    expect(result).toEqual({ message: "Timeout - conversation set to open" });

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(updatedConversation?.status).toBe("open");
  });
});

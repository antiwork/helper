import { conversationEventsFactory } from "@tests/support/factories/conversationEvents";
import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { mergeSimilarConversations } from "@/jobs/mergeSimilarConversations";
import { runAIObjectQuery } from "@/lib/ai";
import { getMailbox } from "@/lib/data/mailbox";

vi.mock("@/lib/ai", () => ({
  runAIObjectQuery: vi.fn(),
}));

vi.mock("@/lib/data/mailbox", () => ({
  getMailbox: vi.fn(),
}));

describe("mergeSimilarConversations", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    const { mailbox } = await mailboxFactory.create();
    vi.mocked(getMailbox).mockResolvedValue(mailbox as any);
  });

  it("skips when conversation is already merged", async () => {
    const { conversation: target } = await conversationFactory.create();
    const { conversation } = await conversationFactory.create({ mergedIntoId: target.id });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    const result = await mergeSimilarConversations({ messageId: message.id });

    expect(result).toEqual({ message: "Skipped: conversation is already merged" });
    const updated = await db.query.conversations.findFirst({ where: eq(conversations.id, conversation.id) });
    expect(updated?.mergedIntoId).toBe(target.id);
    expect(runAIObjectQuery).not.toHaveBeenCalled();
  });

  it("skips when it is not the first user message", async () => {
    const { conversation } = await conversationFactory.create();
    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    });
    const second = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      createdAt: new Date("2024-01-02T00:00:00Z"),
    });

    const result = await mergeSimilarConversations({ messageId: second.message.id });

    expect(result).toEqual({ message: "Skipped: not the first message and not immediately after escalation" });
    expect(runAIObjectQuery).not.toHaveBeenCalled();
  });

  it("skips when escalated before the last message", async () => {
    const now = new Date();
    const earlier = new Date(now.getTime() - 1000);

    const { conversation } = await conversationFactory.create();
    await conversationMessagesFactory.create(conversation.id, { role: "user", createdAt: now });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user", createdAt: now });

    await conversationEventsFactory.create(conversation.id, {
      type: "request_human_support",
      createdAt: earlier,
    });

    const result = await mergeSimilarConversations({ messageId: message.id });

    expect(result).toEqual({ message: "Skipped: not the first message and not immediately after escalation" });
    expect(runAIObjectQuery).not.toHaveBeenCalled();
  });

  it("continues when escalated immediately after last message", async () => {
    const now = new Date();
    const later = new Date(now.getTime() + 1000);

    const { conversation } = await conversationFactory.create();
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user", createdAt: now });

    await conversationEventsFactory.create(conversation.id, {
      type: "request_human_support",
      createdAt: later,
    });

    const result = await mergeSimilarConversations({ messageId: message.id });

    expect(result).toEqual({ message: "No other conversations from this customer found" });
    expect(runAIObjectQuery).not.toHaveBeenCalled();
  });

  it("returns when no other conversations exist for this customer", async () => {
    const { conversation } = await conversationFactory.create({ emailFrom: "customer@example.com" });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    const result = await mergeSimilarConversations({ messageId: message.id });

    expect(result).toEqual({ message: "No other conversations from this customer found" });
    expect(runAIObjectQuery).not.toHaveBeenCalled();
  });

  it("merges into the target conversation when AI requests it", async () => {
    const email = "customer@example.com";
    const currentLastUserEmailDate = new Date("2024-01-01T00:00:00Z");
    const targetLastUserEmailDate = new Date("2023-01-01T00:00:00Z");
    const targetLastReadAt = new Date("2023-05-01T00:00:00Z");

    const { conversation: target } = await conversationFactory.create({
      emailFrom: email,
      lastUserEmailCreatedAt: targetLastUserEmailDate,
      lastReadAt: targetLastReadAt,
    });

    const { conversation } = await conversationFactory.create({
      emailFrom: email,
      lastUserEmailCreatedAt: currentLastUserEmailDate,
    });

    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    vi.mocked(runAIObjectQuery).mockResolvedValueOnce({
      shouldMerge: true,
      mergeIntoId: target.id,
      reason: "Same issue",
    } as any);

    const result = await mergeSimilarConversations({ messageId: message.id });

    expect(result).toMatchObject({
      message: `Conversation ${conversation.id} merged into ${target.id}`,
      reason: "Same issue",
    });

    const updatedCurrent = await db.query.conversations.findFirst({ where: eq(conversations.id, conversation.id) });
    expect(updatedCurrent?.mergedIntoId).toBe(target.id);

    const updatedTarget = await db.query.conversations.findFirst({ where: eq(conversations.id, target.id) });
    expect(updatedTarget?.lastUserEmailCreatedAt?.toISOString()).toBe(currentLastUserEmailDate.toISOString());
    expect(updatedTarget?.lastReadAt?.toISOString()).toBe(currentLastUserEmailDate.toISOString());
  });

  it("returns invalid target when AI picks a non-existent conversation", async () => {
    const email = "customer@example.com";
    const { conversation: other } = await conversationFactory.create({ emailFrom: email });
    const { conversation } = await conversationFactory.create({ emailFrom: email });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    expect(other.id).toBeTruthy();

    vi.mocked(runAIObjectQuery).mockResolvedValueOnce({
      shouldMerge: true,
      mergeIntoId: other.id + 99999,
      reason: "Wrong",
    } as any);

    const result = await mergeSimilarConversations({ messageId: message.id });

    expect(result).toEqual({ message: `Invalid merge target ID: ${other.id + 99999}` });

    const unchanged = await db.query.conversations.findFirst({ where: eq(conversations.id, conversation.id) });
    expect(unchanged?.mergedIntoId).toBeNull();
  });

  it("does not merge when AI says no", async () => {
    const email = "customer@example.com";
    const { conversation: other } = await conversationFactory.create({ emailFrom: email });
    const { conversation } = await conversationFactory.create({ emailFrom: email });
    const { message } = await conversationMessagesFactory.create(conversation.id, { role: "user" });

    expect(other.id).toBeTruthy();

    vi.mocked(runAIObjectQuery).mockResolvedValueOnce({
      shouldMerge: false,
      mergeIntoId: null,
      reason: "Different topics",
    } as any);

    const result = await mergeSimilarConversations({ messageId: message.id });

    expect(result).toEqual({ message: "No merge needed", reason: "Different topics" });

    const unchanged = await db.query.conversations.findFirst({ where: eq(conversations.id, conversation.id) });
    expect(unchanged?.mergedIntoId).toBeNull();
  });
});

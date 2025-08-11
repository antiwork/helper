import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { runAIObjectQuery } from "@/lib/ai";
import { MINI_MODEL } from "@/lib/ai/core";
import { generateConversationSummary } from "@/lib/ai/generateConversationSummary";

// Mock the runAIObjectQuery function
vi.mock("@/lib/ai", () => ({
  runAIObjectQuery: vi.fn(),
}));

describe("generateConversationSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a summary for a conversation", async () => {
    await mailboxFactory.create();
    const { conversation } = await conversationFactory.create();
    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "Hello, I have a question about my order.",
    });
    await conversationMessagesFactory.create(conversation.id, {
      role: "staff",
      cleanedUpText: "Sure, I'd be happy to help. What's your order number?",
    });
    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "My order number is 12345.",
    });
    await conversationMessagesFactory.create(conversation.id, {
      role: "staff",
      cleanedUpText: "Thank you. I see your order. What specific question do you have?",
    });

    const mockSummary = [
      "Customer inquired about their order.",
      "Staff requested the order number.",
      "Customer provided order number 12345.",
    ];
    vi.mocked(runAIObjectQuery).mockResolvedValue({ summary: mockSummary });

    const result = await generateConversationSummary(conversation);

    expect(result).toBe(true);

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(updatedConversation?.summary).toEqual(mockSummary);

    const expectedMessages = [
      {
        role: "user",
        content: [
          "From: user",
          "Content: Hello, I have a question about my order.",
          "",
          "From: assistant",
          "Content: Sure, I'd be happy to help. What's your order number?",
          "",
          "From: user",
          "Content: My order number is 12345.",
          "",
          "From: assistant",
          "Content: Thank you. I see your order. What specific question do you have?",
        ].join("\n"),
      },
    ];

    expect(runAIObjectQuery).toHaveBeenCalledWith({
      model: MINI_MODEL,
      queryType: "conversation_summary",
      functionId: "generate-conversation-summary",
      system: expect.stringMatching(/summarize all the messages/),
      messages: expectedMessages,
      schema: expect.any(Object),
      shortenPromptBy: {
        truncateMessages: true,
      },
      mailbox: expect.any(Object),
    });
  });

  it("does not generate a summary for conversations with 2 or fewer messages", async () => {
    await mailboxFactory.create();
    const { conversation } = await conversationFactory.create();
    await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "Test message",
    });

    const result = await generateConversationSummary(conversation);

    expect(result).toBe(false);

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(updatedConversation?.summary).toBeNull();

    expect(runAIObjectQuery).not.toHaveBeenCalled();
  });

  it("includes messages from merged conversations in the prompt", async () => {
    await mailboxFactory.create();
    const { conversation: mainConversation } = await conversationFactory.create();
    const { conversation: mergedConversation } = await conversationFactory.create();

    await conversationMessagesFactory.create(mainConversation.id, {
      role: "user",
      cleanedUpText: "I need help with my account setup.",
    });
    await conversationMessagesFactory.create(mainConversation.id, {
      role: "staff",
      cleanedUpText: "I can help you with that. What specific issue are you facing?",
    });
    await conversationMessagesFactory.create(mainConversation.id, {
      role: "user",
      cleanedUpText: "I can't login to my dashboard.",
    });

    await conversationMessagesFactory.create(mergedConversation.id, {
      role: "user",
      cleanedUpText: "Also, I forgot my password.",
    });
    await conversationMessagesFactory.create(mergedConversation.id, {
      role: "staff",
      cleanedUpText: "I'll help you reset your password.",
    });

    await db
      .update(conversations)
      .set({ mergedIntoId: mainConversation.id })
      .where(eq(conversations.id, mergedConversation.id));

    const mockSummary = [
      "Customer needed help with account setup and login issues.",
      "Customer also requested password reset assistance.",
      "Staff provided support for both login and password issues.",
    ];
    vi.mocked(runAIObjectQuery).mockResolvedValue({ summary: mockSummary });

    const result = await generateConversationSummary(mainConversation);

    expect(result).toBe(true);

    const expectedMessages = [
      {
        role: "user",
        content: [
          "From: user",
          "Content: I need help with my account setup.",
          "",
          "From: assistant",
          "Content: I can help you with that. What specific issue are you facing?",
          "",
          "From: user",
          "Content: I can't login to my dashboard.",
          "",
          "From: user",
          "Content: Also, I forgot my password.",
          "",
          "From: assistant",
          "Content: I'll help you reset your password.",
        ].join("\n"),
      },
    ];

    expect(runAIObjectQuery).toHaveBeenCalledWith({
      model: MINI_MODEL,
      queryType: "conversation_summary",
      functionId: "generate-conversation-summary",
      system: expect.stringMatching(/summarize all the messages/),
      messages: expectedMessages,
      schema: expect.any(Object),
      shortenPromptBy: {
        truncateMessages: true,
      },
      mailbox: expect.any(Object),
    });
  });
});

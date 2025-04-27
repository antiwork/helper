import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { runAIObjectQuery } from "@/lib/ai";
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
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
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
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "staff",
      cleanedUpText: "Thank you. I see your order. What specific question do you have?",
    });

    const mockSummary = [
      "Customer inquired about their order.",
      "Staff requested the order number.",
      "Customer provided order number 12345.",
    ];
    vi.mocked(runAIObjectQuery).mockResolvedValue({ summary: mockSummary });

    const result = await generateConversationSummary(conversation.id);

    expect(result).toBe("Summary generated");

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
      mailbox,
      queryType: "conversation_summary",
      functionId: "generate-conversation-summary",
      system: expect.stringMatching(/summarize all the messages/),
      messages: expectedMessages,
      schema: expect.any(Object),
      shortenPromptBy: {
        truncateMessages: true,
      },
    });
  });

  it("does not generate a summary for conversations with 2 or fewer messages", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "Test message",
    });

    const result = await generateConversationSummary(conversation.id);

    expect(result).toBe("No summary needed");

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });
    expect(updatedConversation?.summary).toBeNull();

    expect(runAIObjectQuery).not.toHaveBeenCalled();
  });
});

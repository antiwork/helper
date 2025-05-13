import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCompletion } from "@/lib/ai/core";
import { generateDraftResponse } from "@/lib/ai/generateResponse";

vi.mock("@/lib/ai/core", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  generateCompletion: vi.fn(),
  cleanUpTextForAI: vi.fn(),
  GPT_4_1_MODEL: "gpt-4.1",
}));

vi.mock("@/lib/ai/tools", () => ({
  buildTools: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/lib/data/organization", () => ({
  getClerkOrganization: vi.fn(),
}));

describe("generateDraftResponse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles metadata in the draft response generation", async () => {
    vi.mocked(generateCompletion).mockResolvedValueOnce({ text: "Your order is on its way!" } as any);

    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message: lastUserEmail } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "What's the status of my order?",
    });

    const metadata = { orderId: "12345", orderStatus: "shipped" };

    const result = await generateDraftResponse(
      mailbox.id,
      { ...lastUserEmail, conversation: { subject: "test subject" } },
      metadata,
    );

    expect(result.promptInfo.metadata).toEqual(`User metadata:\n${JSON.stringify(metadata, null, 2)}`);
    expect(result.draftResponse).toContain("Your order is on its way!");
  });

  it("generates a draft response without style linting when not configured", async () => {
    vi.mocked(generateCompletion).mockResolvedValueOnce({ text: "Here's how to reset your password..." } as any);

    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message: lastUserEmail } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "How do I reset my password?",
    });

    const result = await generateDraftResponse(
      mailbox.id,
      { ...lastUserEmail, conversation: { subject: "test subject" } },
      null,
    );
    expect(generateCompletion).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      draftResponse: "<p>Here's how to reset your password...</p>\n",
      promptInfo: expect.objectContaining({
        pinned_replies: null,
        past_conversations: null,
        metadata: null,
      }),
    });
  });
});

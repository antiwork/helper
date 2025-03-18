import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { styleLinterFactory } from "@tests/support/factories/styleLinters";
import { userFactory } from "@tests/support/factories/users";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCompletion } from "@/lib/ai/core";
import { generateDraftResponse } from "@/lib/ai/generateResponse";
import { getClerkOrganization } from "@/lib/data/organization";

vi.mock("@/lib/ai/core", () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  generateCompletion: vi.fn(),
  cleanUpTextForAI: vi.fn(),
  GPT_4O_MODEL: "gpt-4o",
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

  it("generates a draft response with style linting", async () => {
    vi.mocked(generateCompletion)
      .mockResolvedValueOnce({ text: "Here are the steps to reset your password..." } as any)
      .mockResolvedValueOnce({ text: "1. Click on the link in the email" } as any);

    const { organization, mailbox } = await userFactory.createRootUser({
      organizationOverrides: { privateMetadata: { isStyleLinterEnabled: true } },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message: lastUserEmail } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "How do I reset my password?",
    });

    await styleLinterFactory.create(organization.id, {
      before: "Hello",
      after: "Greetings",
    });

    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const result = await generateDraftResponse(
      mailbox.id,
      { ...lastUserEmail, conversation: { subject: "test subject" } },
      null,
    );
    expect(generateCompletion).toHaveBeenCalledTimes(2);

    expect(result).toEqual({
      draftResponse: "<ol>\n<li>Click on the link in the email</li>\n</ol>\n",
      promptInfo: expect.objectContaining({
        base_prompt: "",
        pinned_replies: null,
        past_conversations: null,
        metadata: null,
        style_linter_examples: expect.stringContaining("Before: Hello\nAfter: Greetings"),
        unstyled_response: "Here are the steps to reset your password...",
      }),
    });
  });

  it("handles metadata in the draft response generation", async () => {
    vi.mocked(generateCompletion).mockResolvedValueOnce({ text: "Your order is on its way!" } as any);

    const { mailbox, organization } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message: lastUserEmail } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "What's the status of my order?",
    });

    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

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

    const { mailbox, organization } = await userFactory.createRootUser({
      organizationOverrides: { privateMetadata: { isStyleLinterEnabled: false } },
    });
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message: lastUserEmail } = await conversationMessagesFactory.create(conversation.id, {
      role: "user",
      cleanedUpText: "How do I reset my password?",
    });

    vi.mocked(getClerkOrganization).mockResolvedValue(organization);

    const result = await generateDraftResponse(
      mailbox.id,
      { ...lastUserEmail, conversation: { subject: "test subject" } },
      null,
    );
    expect(generateCompletion).toHaveBeenCalledTimes(1);

    expect(result).toEqual({
      draftResponse: "<p>Here's how to reset your password...</p>\n",
      promptInfo: expect.objectContaining({
        base_prompt: "",
        pinned_replies: null,
        past_conversations: null,
        metadata: null,
        style_linter_examples: null,
        unstyled_response: "Here's how to reset your password...",
      }),
    });
  });
});

import { describe, expect, it } from "vitest";
import { knowledgeBankPrompt } from "@/lib/ai/prompts";

describe("knowledgeBankPrompt", () => {
  it("formats knowledge bank correctly", () => {
    const mockKnowledgeBank = [
      {
        id: 1,
        content: "How to process a refund",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageId: null,
        embedding: null,
      },
      {
        id: 2,
        content: "Where to find my API key",
        createdAt: new Date(),
        updatedAt: new Date(),
        messageId: null,
        embedding: null,
      },
    ];

    const result = knowledgeBankPrompt(mockKnowledgeBank);

    expect(result).toContain("How to process a refund");
    expect(result).toContain("Where to find my API key");
  });

  it("handles empty knowledge bank list", () => {
    const result = knowledgeBankPrompt([]);
    expect(result).toBe(null);
  });
});

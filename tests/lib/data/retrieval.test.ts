import { userFactory } from "@tests/support/factories/users";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import * as aiModule from "@/lib/ai";
import { getPastConversationsPrompt } from "@/lib/data/retrieval";

describe("getPastConversationsPrompt", () => {
  it("returns past conversations based on similarity", async () => {
    await userFactory.createRootUser();
    const query = "How do I reset my password?";

    // Mock the generateEmbedding function
    const mockEmbedding = Array.from(new Float32Array(1536).fill(0.1));
    vi.spyOn(aiModule, "generateEmbedding").mockResolvedValue(mockEmbedding);

    // Create test conversations
    const testConversations = [
      { id: 1, similarity: 0.9 },
      { id: 2, similarity: 0.8 },
      { id: 3, similarity: 0.7 },
    ];

    for (const conv of testConversations) {
      await db.insert(conversations).values({
        id: conv.id,
        embedding: mockEmbedding,
        conversationProvider: "gmail",
      });

      await db.insert(conversationMessages).values({
        conversationId: conv.id,
        body: `Test message for conversation ${conv.id}`,
        role: "user",
        isPerfect: false,
        isFlaggedAsBad: false,
        reason: null,
        isPinned: false,
      });
    }

    const result = await getPastConversationsPrompt(query);

    expect(result).toContain("Your goal is to provide helpful and accurate responses");
    expect(result).toContain("Past conversations:");
    expect(result).toContain("Here is the user query to answer:\nHow do I reset my password?");

    for (const conv of testConversations) {
      expect(result).toContain(`Test message for conversation ${conv.id}`);
    }
  });

  it("returns null when no similar conversations exist", async () => {
    await userFactory.createRootUser();
    const query = "This is a unique query with no similar conversations";

    const mockEmbedding = Array.from(new Float32Array(1536).fill(0.1));
    vi.spyOn(aiModule, "generateEmbedding").mockResolvedValue(mockEmbedding);

    const result = await getPastConversationsPrompt(query);

    expect(result).toBe(null);
  });
});

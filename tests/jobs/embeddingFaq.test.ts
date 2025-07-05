import { faqsFactory } from "@tests/support/factories/faqs";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { faqs } from "@/db/schema";
import { embeddingFaq } from "@/jobs/embeddingFaq";
import { generateEmbedding } from "@/lib/ai";

vi.mock("@/lib/ai", () => ({
  generateEmbedding: vi.fn(),
}));

describe("embeddingFaq", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates and stores embedding for a FAQ", async () => {
    const { faq } = await faqsFactory.create({
      content: "Test Body",
      embedding: null,
    });

    const mockEmbedding = Array.from({ length: 1536 }, () => 0.1);
    vi.mocked(generateEmbedding).mockResolvedValue(mockEmbedding);

    await embeddingFaq({ faqId: faq.id });

    expect(generateEmbedding).toHaveBeenCalledWith("Test Body", "embedding-faq", {
      skipCache: true,
    });

    const updatedFaq = await db.query.faqs.findFirst({
      where: eq(faqs.id, faq.id),
    });

    expect(updatedFaq?.embedding).toEqual(mockEmbedding);
  });

  it("throws an error if the FAQ is not found", async () => {
    await expect(embeddingFaq({ faqId: 999 })).rejects.toThrow("Value is undefined");
  });

  it("handles errors during embedding generation", async () => {
    const { faq } = await faqsFactory.create();

    vi.mocked(generateEmbedding).mockRejectedValue(new Error("Embedding generation failed"));

    await expect(embeddingFaq({ faqId: faq.id })).rejects.toThrow("Embedding generation failed");

    const updatedFaq = await db.query.faqs.findFirst({
      where: eq(faqs.id, faq.id),
    });

    expect(updatedFaq?.embedding).toBeNull();
  });
});

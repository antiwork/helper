import { createHash } from "crypto";
import { embed } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateEmbedding } from "@/lib/ai/core";
import { redis } from "@/lib/redis/client";

vi.mock("@/lib/redis/client", () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock("ai", () => ({
  embed: vi.fn(),
}));

describe("generateEmbedding", () => {
  const mockEmbedding = [0.1, 0.2, 0.3];
  const mockInput = "Test input";
  const cacheKey = `embedding:${createHash("md5").update(mockInput).digest("hex")}`;

  beforeEach(() => {
    vi.mocked(embed).mockResolvedValue({
      embedding: mockEmbedding,
      value: mockInput,
      usage: { tokens: 100 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached embedding if available", async () => {
    vi.mocked(redis.get).mockResolvedValue(mockEmbedding);

    const result = await generateEmbedding(mockInput);

    expect(result).toEqual(mockEmbedding);
    expect(redis.get).toHaveBeenCalledWith(cacheKey);
    expect(embed).not.toHaveBeenCalled();
  });

  it("generates new embedding if not cached", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);

    const result = await generateEmbedding(mockInput);

    expect(result).toEqual(mockEmbedding);
    expect(redis.get).toHaveBeenCalledWith(cacheKey);
    expect(embed).toHaveBeenCalledWith({
      model: expect.any(Object),
      value: mockInput,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generate-embedding",
      },
    });
    expect(redis.set).toHaveBeenCalledWith(cacheKey, mockEmbedding, { ex: 60 * 60 * 24 * 30 });
  });

  it("uses custom functionId when provided", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    const customFunctionId = "custom-function-id";

    await generateEmbedding(mockInput, customFunctionId);

    expect(embed).toHaveBeenCalledWith({
      model: expect.any(Object),
      value: mockInput,
      experimental_telemetry: {
        isEnabled: true,
        functionId: customFunctionId,
      },
    });
  });

  it("replaces newlines with spaces in input", async () => {
    vi.mocked(redis.get).mockResolvedValue(null);
    const inputWithNewlines = "Test\ninput\nwith\nnewlines";

    await generateEmbedding(inputWithNewlines);

    expect(embed).toHaveBeenCalledWith({
      value: "Test input with newlines",
      model: expect.any(Object),
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generate-embedding",
      },
    });
  });

  it("skips cache when skipCache option is true", async () => {
    vi.mocked(redis.get).mockResolvedValue(mockEmbedding);

    const result = await generateEmbedding(mockInput, undefined, { skipCache: true });

    expect(result).toEqual(mockEmbedding);
    expect(redis.get).not.toHaveBeenCalled();
    expect(embed).toHaveBeenCalledWith({
      model: expect.any(Object),
      value: mockInput,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generate-embedding",
      },
    });
    expect(redis.set).not.toHaveBeenCalled();
  });
});

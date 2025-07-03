import { embed } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateEmbedding } from "@/lib/ai/core";
import { cacheFor } from "@/lib/cache";

vi.mock("@/lib/cache", () => ({
  cacheFor: vi.fn(),
}));

vi.mock("ai", () => ({
  embed: vi.fn(),
}));

describe("generateEmbedding", () => {
  const mockEmbedding = [0.1, 0.2, 0.3];
  const mockInput = "Test input";

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
    const mockCache = { get: vi.fn(), set: vi.fn() };
    vi.mocked(cacheFor).mockReturnValue(mockCache);
    mockCache.get.mockResolvedValue(mockEmbedding);

    const result = await generateEmbedding(mockInput);

    expect(result).toEqual(mockEmbedding);
    expect(mockCache.get).toHaveBeenCalledWith();
    expect(embed).not.toHaveBeenCalled();
  });

  it("generates new embedding if not cached", async () => {
    const mockCache = { get: vi.fn(), set: vi.fn() };
    vi.mocked(cacheFor).mockReturnValue(mockCache);
    mockCache.get.mockResolvedValue(null);

    const result = await generateEmbedding(mockInput);

    expect(result).toEqual(mockEmbedding);
    expect(mockCache.get).toHaveBeenCalledWith();
    expect(embed).toHaveBeenCalledWith({
      model: expect.any(Object),
      value: mockInput,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generate-embedding",
      },
    });
    expect(mockCache.set).toHaveBeenCalledWith(mockEmbedding, 60 * 60 * 24 * 30);
  });

  it("uses custom functionId when provided", async () => {
    const mockCache = { get: vi.fn(), set: vi.fn() };
    vi.mocked(cacheFor).mockReturnValue(mockCache);
    mockCache.get.mockResolvedValue(null);
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
    const mockCache = { get: vi.fn(), set: vi.fn() };
    vi.mocked(cacheFor).mockReturnValue(mockCache);
    mockCache.get.mockResolvedValue(null);
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
    const mockCache = { get: vi.fn(), set: vi.fn() };
    vi.mocked(cacheFor).mockReturnValue(mockCache);
    mockCache.get.mockResolvedValue(mockEmbedding);

    const result = await generateEmbedding(mockInput, undefined, { skipCache: true });

    expect(result).toEqual(mockEmbedding);
    expect(mockCache.get).not.toHaveBeenCalled();
    expect(embed).toHaveBeenCalledWith({
      model: expect.any(Object),
      value: mockInput,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "generate-embedding",
      },
    });
    expect(mockCache.set).not.toHaveBeenCalled();
  });
});

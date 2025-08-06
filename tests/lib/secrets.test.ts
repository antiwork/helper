import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("secrets", () => {
  let secretsModule: any;
  let mockCache: any;
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Clear any previous module cache
    vi.resetModules();

    // Mock the cache
    mockCache = {
      get: vi.fn(),
      set: vi.fn(),
    };

    // Mock the database execute function
    mockDb = {
      execute: vi.fn(),
    };

    // Mock modules using doMock for test isolation
    vi.doMock("@/lib/cache", () => ({
      cacheFor: vi.fn(() => mockCache),
    }));

    vi.doMock("@/db/client", () => ({
      db: mockDb,
    }));

    // Import the module after mocking
    secretsModule = await import("@/lib/secrets");
  });

  afterEach(() => {
    vi.doUnmock("@/lib/cache");
    vi.doUnmock("@/db/client");
  });

  it("should get secret from cache if available", async () => {
    mockCache.get.mockResolvedValue("cached-secret");

    const result = await secretsModule.getOrCreateSecret("test-secret");

    expect(result).toBe("cached-secret");
    expect(mockCache.get).toHaveBeenCalled();
  });

  it("should create new secret if not in cache or vault", async () => {
    mockCache.get.mockResolvedValue(null);

    mockDb.execute
      .mockResolvedValueOnce({ rows: [] }) // No existing secret
      .mockResolvedValueOnce({ rows: [] }); // Create secret

    const result = await secretsModule.getOrCreateSecret("test-secret");

    expect(result).toMatch(/^[a-f0-9]{32}$/); // 32 character hex string
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
    expect(mockCache.set).toHaveBeenCalled();
  });

  it("should get existing secret from vault if not in cache", async () => {
    mockCache.get.mockResolvedValue(null);

    mockDb.execute.mockResolvedValue({
      rows: [{ decrypted_secret: "existing-secret" }],
    });

    const result = await secretsModule.getOrCreateSecret("test-secret");

    expect(result).toBe("existing-secret");
    expect(mockCache.set).toHaveBeenCalledWith("existing-secret", 300);
  });

  it("should return null when secret doesn't exist in getSecret", async () => {
    mockCache.get.mockResolvedValue(null);

    mockDb.execute.mockResolvedValue({ rows: [] });

    const result = await secretsModule.getSecret("non-existent-secret");

    expect(result).toBeNull();
  });

  it("should handle database errors gracefully", async () => {
    mockCache.get.mockResolvedValue(null);

    mockDb.execute.mockRejectedValue(new Error("Database error"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await secretsModule.getOrCreateSecret("test-secret");

    expect(result).toMatch(/^[a-f0-9]{32}$/); // Should return fallback secret
    expect(consoleSpy).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
  it("should use different cache keys for different secrets", async () => {
    // Get the mocked cacheFor function
    const cacheModule = await import("@/lib/cache");
    const mockCacheFor = vi.mocked(cacheModule.cacheFor);

    // Call with different secret names
    await secretsModule.getOrCreateSecret("secret-1");
    await secretsModule.getOrCreateSecret("secret-2");

    // Verify cacheFor was called with different keys
    expect(mockCacheFor).toHaveBeenCalledWith("vault-secret-secret-1");
    expect(mockCacheFor).toHaveBeenCalledWith("vault-secret-secret-2");
  });
});

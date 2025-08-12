import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("secrets", () => {
  let mockDb: { execute: any };
  let secretsModule: any;

  beforeEach(async () => {
    // Clear any previous module cache
    vi.resetModules();

    mockDb = {
      execute: vi.fn(),
    };

    // Mock React's cache function to just return the function as-is
    vi.doMock("react", () => ({
      cache: (fn: any) => fn,
    }));

    // Mock modules using doMock for test isolation
    vi.doMock("@/db/client", () => ({
      db: mockDb,
    }));

    // Import the module after mocking
    secretsModule = await import("@/lib/secrets");
  });

  afterEach(() => {
    vi.doUnmock("@/db/client");
    vi.doUnmock("react");
    vi.clearAllMocks();
  });

  it("should create new secret if not in vault", async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] }) // No existing secret
      .mockResolvedValueOnce({ rows: [] }); // Create secret

    const result = await secretsModule.getOrCreateSecret(secretsModule.SECRET_NAMES.JOBS_HMAC);

    expect(result).toMatch(/^[a-f0-9]{32}$/); // 32 character hex string
    expect(mockDb.execute).toHaveBeenCalledTimes(2);
  });

  it("should get existing secret from vault", async () => {
    mockDb.execute.mockResolvedValue({
      rows: [{ decrypted_secret: "existing-secret" }],
    });

    const result = await secretsModule.getOrCreateSecret(secretsModule.SECRET_NAMES.JOBS_HMAC);

    expect(result).toBe("existing-secret");
  });

  it("should return null when secret doesn't exist in getSecret", async () => {
    mockDb.execute.mockResolvedValue({ rows: [] });

    const result = await secretsModule.getSecret(secretsModule.SECRET_NAMES.JOBS_HMAC);

    expect(result).toBeNull();
  });

  it("should handle database errors gracefully", async () => {
    mockDb.execute.mockRejectedValue(new Error("Database error"));

    await expect(secretsModule.getOrCreateSecret(secretsModule.SECRET_NAMES.JOBS_HMAC)).rejects.toThrow(
      "Database error",
    );
  });
});

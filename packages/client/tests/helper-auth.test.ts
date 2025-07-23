import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateHelperAuth } from "../src/auth/helper-auth";

describe("helper-auth", () => {
  const originalEnv = process.env;
  const mockTimestamp = 1735420862868;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    vi.spyOn(Date, "now").mockImplementation(() => mockTimestamp);
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe("generateHelperAuth", () => {
    it("generates valid HMAC auth parameters using environment variables", () => {
      process.env.HELPER_HMAC_SECRET = "test-secret";
      const email = "test@example.com";
      const result = generateHelperAuth({ email });
      expect(result).toEqual({
        email,
        timestamp: mockTimestamp,
        emailHash: expect.any(String),
      });
      expect(result.emailHash).toHaveLength(64);
    });

    it("uses provided parameters over environment variables", () => {
      process.env.HELPER_HMAC_SECRET = "env-secret";
      const email = "test@example.com";
      const result = generateHelperAuth({
        email,
        hmacSecret: "param-secret",
      });
      expect(result).toEqual({
        email,
        timestamp: mockTimestamp,
        emailHash: expect.any(String),
      });
      expect(result.emailHash).toHaveLength(64);
    });

    it("throws error if HMAC secret is not provided", () => {
      process.env.HELPER_HMAC_SECRET = undefined;
      expect(() => generateHelperAuth({ email: "test@example.com" })).toThrow(
        "HMAC secret must be provided via parameter or HELPER_HMAC_SECRET environment variable",
      );
    });
  });
});

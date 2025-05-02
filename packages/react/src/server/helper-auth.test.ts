import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateHelperAuth } from "./helper-auth";

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
      process.env.HELPER_MAILBOX_SLUG = "test-mailbox";

      const email = "test@example.com";

      const result = generateHelperAuth({ email });

      expect(result).toEqual({
        email,
        timestamp: mockTimestamp,
        email_hash: expect.any(String),
        mailbox_slug: "test-mailbox",
      });
      expect(result.email_hash).toHaveLength(64);
    });

    it("uses provided parameters over environment variables", () => {
      process.env.HELPER_HMAC_SECRET = "env-secret";
      process.env.HELPER_MAILBOX_SLUG = "env-mailbox";

      const email = "test@example.com";

      const result = generateHelperAuth({
        email,
        hmacSecret: "param-secret",
        mailboxSlug: "param-mailbox",
      });

      expect(result).toEqual({
        email,
        timestamp: mockTimestamp,
        email_hash: expect.any(String),
        mailbox_slug: "param-mailbox",
      });
      expect(result.email_hash).toHaveLength(64);
    });

    it("throws error if HMAC secret is not provided", () => {
      process.env.HELPER_HMAC_SECRET = undefined;

      expect(() => generateHelperAuth({ email: "test@example.com" })).toThrow(
        "HMAC secret must be provided via parameter or HELPER_HMAC_SECRET environment variable",
      );
    });

    it("throws error if mailbox slug is not provided", () => {
      process.env.HELPER_HMAC_SECRET = "test-secret";
      process.env.HELPER_MAILBOX_SLUG = undefined;

      expect(() => generateHelperAuth({ email: "test@example.com" })).toThrow(
        "Mailbox slug must be provided via parameter or HELPER_MAILBOX_SLUG environment variable",
      );
    });
  });
});

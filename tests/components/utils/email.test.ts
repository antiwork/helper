import { describe, expect, test } from "vitest";
import { parseEmailList } from "@/components/utils/email";

describe("parseEmailList", () => {
  test("parses valid email list correctly", () => {
    const input = "test@example.com, user@domain.org, admin@site.net";
    const result = parseEmailList(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["test@example.com", "user@domain.org", "admin@site.net"]);
    }
  });

  test("handles single valid email", () => {
    const input = "single@example.com";
    const result = parseEmailList(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["single@example.com"]);
    }
  });

  test("trims whitespace from emails", () => {
    const input = " test@example.com , user@domain.org  ,  admin@site.net ";
    const result = parseEmailList(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["test@example.com", "user@domain.org", "admin@site.net"]);
    }
  });

  test("filters out empty entries", () => {
    const input = "test@example.com,,user@domain.org,";
    const result = parseEmailList(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["test@example.com", "user@domain.org"]);
    }
  });

  test("returns error for invalid email format", () => {
    const input = "invalid-email";
    const result = parseEmailList(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe("ZodError");
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]).toMatchObject({
        code: "invalid_string",
        message: '"invalid-email"',
        path: [0],
      });
    }
  });

  test("returns error for mixed valid and invalid emails", () => {
    const input = "valid@example.com, invalid-email, another@domain.org";
    const result = parseEmailList(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.name).toBe("ZodError");
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]).toMatchObject({
        code: "invalid_string",
        message: '"invalid-email"',
        path: [1],
      });
    }
  });

  test("handles empty string", () => {
    const input = "";
    const result = parseEmailList(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  test("handles whitespace-only string", () => {
    const input = "   ,  ,   ";
    const result = parseEmailList(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual([]);
    }
  });

  test("handles complex email formats", () => {
    const input = "user.name+tag@example.com, test123@sub-domain.example.org";
    const result = parseEmailList(input);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(["user.name+tag@example.com", "test123@sub-domain.example.org"]);
    }
  });
});

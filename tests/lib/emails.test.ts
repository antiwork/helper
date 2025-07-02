import { expect, test } from "vitest";
import { extractAddresses } from "@/lib/emails";

test("extractAddresses", () => {
  const input = "Bob <bob@example.com>, Charlie <charlie@example.com>, dave@example.com";
  const result = extractAddresses(input);

  expect(result).toEqual(["bob@example.com", "charlie@example.com", "dave@example.com"]);

  expect(extractAddresses("alice@example.com")).toEqual(["alice@example.com"]);

  expect(extractAddresses("Eve <eve@example.com>, frank@example.com")).toEqual([
    "eve@example.com",
    "frank@example.com",
  ]);

  expect(extractAddresses("")).toEqual([]);
  expect(extractAddresses("Not an email")).toEqual([]);
});

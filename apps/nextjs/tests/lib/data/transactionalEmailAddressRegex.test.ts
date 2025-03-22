import { expect, test } from "vitest";
import { matchesTransactionalEmailAddress } from "@/lib/data/transactionalEmailAddressRegex";

test("matchesTransactionalEmailAddress", () => {
  expect(matchesTransactionalEmailAddress("noreply@example.com")).toBe(true);
  expect(matchesTransactionalEmailAddress("noreply2@example.com")).toBe(false);
  expect(matchesTransactionalEmailAddress("bob@gmail.com")).toBe(false);
});

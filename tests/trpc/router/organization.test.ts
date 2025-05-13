import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { describe, expect, inject, it, vi } from "vitest";
import { createCaller } from "@/trpc";

vi.mock("@/lib/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    ABLY_API_KEY: "test_key",
    STRIPE_PRICE_ID: "price_1234567890",
  },
}));

describe("organizationRouter", () => {
  describe("getMembers", () => {
    it("returns all users", async () => {
      const { user } = await userFactory.createRootUser({
        userOverrides: {
          user_metadata: {
            name: "Test User",
          },
        },
      });
      const caller = createCaller(createTestTRPCContext(user));

      const result = await caller.organization.getMembers();

      expect(result).toEqual([
        {
          id: user.id,
          displayName: user.user_metadata?.name,
          email: user.email,
        },
      ]);
    });
  });
});

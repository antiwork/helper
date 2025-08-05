import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { describe, expect, inject, it, vi } from "vitest";
import { createCaller } from "@/trpc";

vi.mock("@/lib/env", () => ({
  isAIMockingEnabled: false,
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
  },
}));

describe("organizationRouter", () => {
  describe("getMembers", () => {
    it("returns all users", async () => {
      const { user } = await userFactory.createRootUser({
        userOverrides: {
          user_metadata: {
            display_name: "Test User",
          },
        },
      });
      const caller = createCaller(await createTestTRPCContext(user));

      const result = await caller.organization.getMembers();

      expect(result).toEqual([
        {
          id: user.id,
          displayName: user.user_metadata?.display_name,
          email: user.email,
          permissions: "member",
          access: {
            keywords: [],
            role: "afk",
          },
        },
      ]);
    });
  });
});

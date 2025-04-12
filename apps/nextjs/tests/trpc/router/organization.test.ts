import { User } from "@clerk/nextjs/server";
import { subscriptionFactory } from "@tests/support/factories/subscriptions";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { describe, expect, inject, it, vi } from "vitest";
import { SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT } from "@/components/constants";
import { getClerkOrganization } from "@/lib/data/organization";
import * as userLib from "@/lib/data/user";
import { createCaller } from "@/trpc";

vi.mock("@/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    ABLY_API_KEY: "test_key",
    STRIPE_PRICE_ID: "price_1234567890",
  },
}));

vi.mock("@/lib/data/user", async () => {
  const actual = await vi.importActual("@/lib/data/user");
  return {
    ...actual,
    getClerkUserList: vi.fn(),
  };
});

vi.mock("@/lib/data/organization", async () => {
  const actual = await vi.importActual("@/lib/data/organization");
  return {
    ...actual,
    getClerkOrganization: vi.fn(),
  };
});

describe("organizationRouter", () => {
  describe("getOnboardingStatus", () => {
    it("returns the correct status for a new user", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const { user, organization } = await userFactory.createRootUser({
        organizationOverrides: {
          privateMetadata: { freeTrialEndsAt: futureDate.toISOString() },
        },
      });
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);

      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.organization.getOnboardingStatus();

      expect(result).toEqual({
        trialInfo: {
          freeTrialEndsAt: futureDate,
          resolutionsCount: null,
          resolutionsLimit: SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT,
          subscriptionStatus: "free_trial",
        },
      });
    });

    it("returns the correct status for a user with a paid subscription", async () => {
      const date = new Date();
      const { user, organization } = await userFactory.createRootUser({
        organizationOverrides: {
          privateMetadata: { freeTrialEndsAt: date.toISOString(), automatedRepliesCount: 1 },
        },
      });
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      await subscriptionFactory.create(organization.id);
      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.organization.getOnboardingStatus();

      expect(result).toEqual({
        trialInfo: {
          freeTrialEndsAt: date,
          resolutionsCount: organization.privateMetadata.automatedRepliesCount,
          resolutionsLimit: SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT,
          subscriptionStatus: "paid",
        },
      });
    });

    it("returns the correct status for a user with expired trial", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const { user, organization } = await userFactory.createRootUser({
        organizationOverrides: {
          privateMetadata: { freeTrialEndsAt: pastDate.toISOString() },
        },
      });
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));

      const result = await caller.organization.getOnboardingStatus();

      expect(result).toEqual({
        trialInfo: {
          freeTrialEndsAt: pastDate,
          resolutionsCount: null,
          resolutionsLimit: SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT,
          subscriptionStatus: "free_trial_expired",
        },
      });
    });
  });

  describe("getMembers", () => {
    it("returns the members of the organization", async () => {
      const { user, organization } = await userFactory.createRootUser();
      vi.mocked(getClerkOrganization).mockResolvedValue(organization);
      const caller = createCaller(createTestTRPCContext(user, organization));

      // Setup mock return value
      vi.mocked(userLib.getClerkUserList).mockResolvedValueOnce({
        data: [
          {
            id: user.id,
            fullName: `${user.firstName} ${user.lastName}`,
            emailAddresses: [
              {
                emailAddress: user.emailAddresses[0]?.emailAddress,
              },
            ],
          } as User,
        ],
      });

      const result = await caller.organization.getMembers();

      expect(result).toEqual([
        {
          id: user.id,
          displayName: `${user.firstName} ${user.lastName}`,
          email: user.emailAddresses[0]?.emailAddress,
        },
      ]);
      expect(userLib.getClerkUserList).toHaveBeenCalledWith(organization.id);
    });
  });
});

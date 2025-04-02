import { subscriptionFactory } from "@tests/support/factories/subscriptions";
import { userFactory } from "@tests/support/factories/users";
import { describe, expect, inject, it, vi } from "vitest";
import { SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT } from "@/components/constants";
import {
  ADDITIONAL_PAID_ORGANIZATION_IDS,
  canSendAutomatedReplies,
  getSubscriptionStatus,
} from "@/lib/data/organization";

vi.mock("@/env", () => ({
  env: {
    POSTGRES_URL: inject("TEST_DATABASE_URL"),
    STRIPE_PRICE_ID: "price_1234567890",
    ADDITIONAL_PAID_ORGANIZATION_IDS: "org_1234567890",
  },
}));

describe("getSubscriptionStatus", () => {
  it("returns 'paid' for Gumroad organization", async () => {
    const { organization } = await userFactory.createRootUser({
      organizationOverrides: { id: ADDITIONAL_PAID_ORGANIZATION_IDS[0] },
    });
    const status = await getSubscriptionStatus(organization);
    expect(status).toBe("paid");
  });

  it("returns 'paid' for organization with active subscription", async () => {
    const { organization } = await userFactory.createRootUser();
    await subscriptionFactory.create(organization.id);

    const status = await getSubscriptionStatus(organization);

    expect(status).toBe("paid");
  });

  it("returns 'free_trial' for organization within trial period", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const { organization } = await userFactory.createRootUser({
      organizationOverrides: {
        privateMetadata: { freeTrialEndsAt: futureDate.toISOString() },
      },
    });
    const status = await getSubscriptionStatus(organization);
    expect(status).toBe("free_trial");
  });

  it("returns 'free_trial_expired' for organization with expired trial", async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 7);
    const { organization } = await userFactory.createRootUser({
      organizationOverrides: {
        privateMetadata: { freeTrialEndsAt: pastDate.toISOString() },
      },
    });
    const status = await getSubscriptionStatus(organization);
    expect(status).toBe("free_trial_expired");
  });
});

describe("await canSendAutomatedReplies", () => {
  it("returns true for Gumroad organization", async () => {
    const { organization } = await userFactory.createRootUser({
      organizationOverrides: { id: ADDITIONAL_PAID_ORGANIZATION_IDS[0] },
    });
    const result = await canSendAutomatedReplies(organization);
    expect(result).toBe(true);
  });

  it("returns true for organization with paid subscription", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const { organization } = await userFactory.createRootUser();
    await subscriptionFactory.create(organization.id, {
      currentPeriodEnd: futureDate,
      status: "active",
    });
    const result = await canSendAutomatedReplies(organization);
    expect(result).toBe(true);
  });

  it("returns true for organization with free trial", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const { organization } = await userFactory.createRootUser({
      organizationOverrides: {
        privateMetadata: { freeTrialEndsAt: futureDate.toISOString() },
      },
    });
    await subscriptionFactory.create(organization.id);
    const result = await canSendAutomatedReplies(organization);
    expect(result).toBe(true);
  });

  it("returns false for organization which exceeds free trial usage limit", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);
    const { organization } = await userFactory.createRootUser({
      organizationOverrides: {
        privateMetadata: {
          freeTrialEndsAt: futureDate.toISOString(),
          automatedRepliesCount: SUBSCRIPTION_FREE_TRIAL_USAGE_LIMIT + 1,
        },
      },
    });
    const result = await canSendAutomatedReplies(organization);
    expect(result).toBe(false);
  });

  it("returns false for organization with no subscription", async () => {
    const { organization } = await userFactory.createRootUser();
    const result = await canSendAutomatedReplies(organization);
    expect(result).toBe(false);
  });
});

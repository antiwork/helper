import { subscriptionFactory } from "@tests/support/factories/subscriptions";
import { userFactory } from "@tests/support/factories/users";
import { describe, expect, it } from "vitest";
import { ADDITIONAL_PAID_ORGANIZATION_IDS, getSubscriptionStatus } from "@/lib/data/organization";

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

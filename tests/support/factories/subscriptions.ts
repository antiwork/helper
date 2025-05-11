import { faker } from "@faker-js/faker";
import { db } from "@/db/client";
import { subscriptions } from "@/db/schema";

export const subscriptionFactory = {
  create: async (organizationId: string, overrides: Partial<typeof subscriptions.$inferInsert> = {}) => {
    const [subscription] = await db
      .insert(subscriptions)
      .values({
        clerkOrganizationId: organizationId,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        stripeSubscriptionId: faker.string.alphanumeric(10),
        stripeCustomerId: faker.string.alphanumeric(10),
        currentPeriodEnd: faker.date.future(),
        status: "active",
        canceledAt: null,
        ...overrides,
      })
      .returning();

    if (!subscription) {
      throw new Error("Subscription not created");
    }

    return { subscription };
  },
};

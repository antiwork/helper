import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { platformCustomers } from "@/db/schema";

export const platformCustomerFactory = {
  create: async (mailboxId: number, overrides: Partial<typeof platformCustomers.$inferInsert> = {}) => {
    const platformCustomer = await db
      .insert(platformCustomers)
      .values({
        mailboxId,
        email: faker.internet.email(),
        name: faker.person.fullName(),
        value: faker.number.float({ min: 0, max: 10000 }).toString(),
        links: { Impersonate: faker.internet.url() },
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return { platformCustomer };
  },
};

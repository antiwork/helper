import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";

export const mailboxFactory = {
  create: async (overrides: Partial<typeof mailboxes.$inferInsert> = {}) => {
    const mailboxName = `${faker.company.name()} Support`;
    const mailbox = await db
      .insert(mailboxes)
      .values({
        name: mailboxName,
        slug: faker.helpers.slugify(mailboxName.toLowerCase()),
        promptUpdatedAt: faker.date.recent(),
        widgetHMACSecret: faker.string.uuid(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return { mailbox };
  },
};

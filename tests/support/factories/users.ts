import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { authUsers, mailboxes } from "@/db/schema";

const createUser = async (overrides: Partial<typeof authUsers.$inferInsert> = {}) => {
  return await db
    .insert(authUsers)
    .values({ id: faker.string.uuid(), email: faker.internet.email(), ...overrides })
    .returning()
    .then(takeUniqueOrThrow);
};

export const userFactory = {
  createRootUser: async ({
    userOverrides = {},
    mailboxOverrides = {},
  }: {
    userOverrides?: Partial<typeof authUsers.$inferInsert>;
    mailboxOverrides?: Partial<typeof mailboxes.$inferInsert>;
  } = {}) => {
    const user = await createUser(userOverrides);

    const mailboxName = `${faker.company.name()} Support`;
    const mailbox = await db
      .insert(mailboxes)
      .values({
        clerkOrganizationId: "",
        name: mailboxName,
        slug: faker.helpers.slugify(mailboxName.toLowerCase()),
        promptUpdatedAt: faker.date.recent(),
        widgetHMACSecret: faker.string.uuid(),
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        onboardingMetadata: {
          completed: true,
        },
        ...mailboxOverrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return {
      user,
      mailbox,
    };
  },
  createUser,
};

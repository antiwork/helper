import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
import { authUsers } from "@/db/supabaseSchema/auth";
import { getFullProfileById } from "@/lib/data/user";

const createUser = async (overrides: Partial<typeof authUsers.$inferInsert> = {}) => {
  const user = await db
    .insert(authUsers)
    .values({ id: faker.string.uuid(), email: faker.internet.email(), ...overrides })
    .returning()
    .then(takeUniqueOrThrow);

  return {
    user,
    profile: assertDefined(await getFullProfileById(user.id)),
  };
};

export const userFactory = {
  createRootUser: async ({
    userOverrides = {},
    mailboxOverrides = {},
  }: {
    userOverrides?: Partial<typeof authUsers.$inferInsert>;
    mailboxOverrides?: Partial<typeof mailboxes.$inferInsert>;
  } = {}) => {
    const { user, profile } = await createUser(userOverrides);

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
        ...mailboxOverrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { user, profile, mailbox };
  },
  createUser,
};

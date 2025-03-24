import type { Organization, User } from "@clerk/nextjs/server";
import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";

const buildMockUser = (overrides: Partial<User> = {}) => {
  return {
    id: faker.string.uuid(),
    username: null,
    emailAddresses: [
      { id: faker.string.uuid(), emailAddress: faker.internet.email(), verification: null, linkedTo: [] },
    ],
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    fullName: `${faker.person.firstName()} ${faker.person.lastName()}`,
    externalAccounts: [],
    ...overrides,
  } as User;
};

const buildMockOrganization = (overrides: Partial<Organization> = {}) => {
  return {
    id: faker.string.uuid(),
    name: faker.company.name(),
    slug: faker.helpers.slugify(faker.company.name().toLowerCase()),
    privateMetadata: {
      automatedRepliesCount: 0,
    },
    ...overrides,
  } as Organization;
};

export const userFactory = {
  createRootUser: async ({
    userOverrides = {},
    organizationOverrides = {},
    mailboxOverrides = {},
  }: {
    userOverrides?: Partial<User>;
    organizationOverrides?: Partial<Organization>;
    mailboxOverrides?: Partial<typeof mailboxes.$inferInsert>;
  } = {}) => {
    const user = buildMockUser(userOverrides);
    const organization = buildMockOrganization(organizationOverrides);

    const mailboxName = `${faker.company.name()} Support`;
    const mailbox = await db
      .insert(mailboxes)
      .values({
        clerkOrganizationId: organization.id,
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
      organization,
    };
  },
  buildMockUser,
};

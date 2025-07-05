import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { mailboxesMetadataApi } from "@/db/schema";
import { METADATA_API_HMAC_SECRET_PREFIX } from "@/lib/data/mailboxMetadataApi";

export const mailboxMetadataApiFactory = {
  create: async (overrides: Partial<typeof mailboxesMetadataApi.$inferInsert> = {}) => {
    const metadataApi = await db
      .insert(mailboxesMetadataApi)
      .values({
        url: faker.internet.url(),
        isEnabled: true,
        hmacSecret: `${METADATA_API_HMAC_SECRET_PREFIX}${crypto.randomUUID().replace(/-/g, "")}`,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return metadataApi;
  },
};

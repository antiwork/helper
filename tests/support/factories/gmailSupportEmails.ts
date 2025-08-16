import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { gmailSupportEmails } from "@/db/schema";

export const gmailSupportEmailFactory = {
  create: async (overrides: Partial<typeof gmailSupportEmails.$inferInsert> = {}) => {
    const accessToken = faker.string.uuid();
    const refreshToken = faker.string.uuid();

    const gmailSupportEmail = await db
      .insert(gmailSupportEmails)
      .values({
        email: faker.internet.email(),
        accessToken,
        refreshToken,
        expiresAt: faker.date.future(),
        historyId: faker.number.int({ min: 1, max: 1000 }),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { gmailSupportEmail };
  },
};

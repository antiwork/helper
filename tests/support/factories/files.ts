import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { files } from "@/db/schema";

export const fileFactory = {
  create: async (conversationMessageId: number | null, overrides: Partial<typeof files.$inferInsert> = {}) => {
    const file = await db
      .insert(files)
      .values({
        messageId: conversationMessageId,
        name: faker.lorem.sentence(),
        key: faker.string.uuid(),
        size: faker.number.int({ min: 1000, max: 1000000 }),
        mimetype: faker.system.mimeType(),
        isInline: false,
        isPublic: false,
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return { file };
  },
};

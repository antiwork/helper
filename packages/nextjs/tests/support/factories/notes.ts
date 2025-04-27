import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { notes } from "@/db/schema";

export const noteFactory = {
  create: async (conversationId: number, overrides: Partial<typeof notes.$inferInsert> = {}) => {
    const note = await db
      .insert(notes)
      .values({
        conversationId,
        body: faker.lorem.sentence(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);
    return { note };
  },
};

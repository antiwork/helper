import { faker } from "@faker-js/faker";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationEvents } from "@/db/schema";

export const conversationEventsFactory = {
  create: async (conversationId: number, overrides: Partial<typeof conversationEvents.$inferInsert> = {}) => {
    const event = await db
      .insert(conversationEvents)
      .values({
        conversationId,
        changes: {
          status: "open",
          assignedToId: null,
        },
        byUserId: faker.string.uuid(),
        reason: faker.lorem.sentence(),
        ...overrides,
      })
      .returning()
      .then(takeUniqueOrThrow);

    return { event };
  },
};

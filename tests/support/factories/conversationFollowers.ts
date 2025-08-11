import { db } from "@/db/client";
import { conversationFollowers } from "@/db/schema";

export const conversationFollowersFactory = {
  create: async (overrides: Partial<typeof conversationFollowers.$inferInsert> = {}) => {
    const [follower] = await db
      .insert(conversationFollowers)
      .values({
        conversationId: overrides.conversationId!,
        userId: overrides.userId!,
        ...overrides,
      })
      .returning();

    return { follower };
  },
};

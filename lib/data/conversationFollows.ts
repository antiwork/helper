import "server-only";
import { and, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import { conversationFollows } from "@/db/schema";

export type ConversationFollow = typeof conversationFollows.$inferSelect;
export type NewConversationFollow = typeof conversationFollows.$inferInsert;

export const followConversation = async (
  conversationId: number,
  userId: string,
  tx: Transaction | typeof db = db,
): Promise<ConversationFollow> => {
  const [follow] = await tx
    .insert(conversationFollows)
    .values({
      conversationId,
      userId,
    })
    .onConflictDoNothing({
      target: [conversationFollows.conversationId, conversationFollows.userId],
    })
    .returning();

  if (follow) {
    return follow;
  }

  // If conflict occurred, return existing follow
  const existingFollow = await tx
    .select()
    .from(conversationFollows)
    .where(
      and(
        eq(conversationFollows.conversationId, conversationId),
        eq(conversationFollows.userId, userId),
      ),
    )
    .then(takeUniqueOrThrow);

  return existingFollow;
};

export const unfollowConversation = async (
  conversationId: number,
  userId: string,
  tx: Transaction | typeof db = db,
): Promise<void> => {
  await tx
    .delete(conversationFollows)
    .where(
      and(
        eq(conversationFollows.conversationId, conversationId),
        eq(conversationFollows.userId, userId),
      ),
    );
};

export const isUserFollowing = async (
  conversationId: number,
  userId: string,
  tx: Transaction | typeof db = db,
): Promise<boolean> => {
  const follow = await tx
    .select({ id: conversationFollows.id })
    .from(conversationFollows)
    .where(
      and(
        eq(conversationFollows.conversationId, conversationId),
        eq(conversationFollows.userId, userId),
      ),
    )
    .limit(1);

  return follow.length > 0;
};

export const getFollowersForConversation = async (
  conversationId: number,
  tx: Transaction | typeof db = db,
): Promise<string[]> => {
  const followers = await tx
    .select({ userId: conversationFollows.userId })
    .from(conversationFollows)
    .where(eq(conversationFollows.conversationId, conversationId));

  return followers.map((f) => f.userId);
};
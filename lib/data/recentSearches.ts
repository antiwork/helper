import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { recentSearches } from "@/db/schema";

const MAX_RECENT_SEARCHES = 5;

export async function getRecentSearches(userId: string, mailboxId: number) {
  return await db.query.recentSearches.findMany({
    where: and(eq(recentSearches.userId, userId), eq(recentSearches.mailboxId, mailboxId)),
    orderBy: [desc(recentSearches.lastUsedAt)],
    limit: MAX_RECENT_SEARCHES,
  });
}

export async function saveRecentSearch(userId: string, mailboxId: number, searchTerm: string) {
  if (!searchTerm.trim()) return;

  await db.transaction(async (tx) => {
    const existingSearch = await tx.query.recentSearches.findFirst({
      where: and(
        eq(recentSearches.userId, userId),
        eq(recentSearches.mailboxId, mailboxId),
        eq(recentSearches.searchTerm, searchTerm.trim()),
      ),
    });

    if (existingSearch) {
      await tx.update(recentSearches).set({ lastUsedAt: new Date() }).where(eq(recentSearches.id, existingSearch.id));
    } else {
      await tx.insert(recentSearches).values({
        userId,
        mailboxId,
        searchTerm: searchTerm.trim(),
        lastUsedAt: new Date(),
      });

      const userSearches = await tx.query.recentSearches.findMany({
        where: and(eq(recentSearches.userId, userId), eq(recentSearches.mailboxId, mailboxId)),
        orderBy: [desc(recentSearches.lastUsedAt)],
      });

      if (userSearches.length > MAX_RECENT_SEARCHES) {
        const searchesToDelete = userSearches.slice(MAX_RECENT_SEARCHES);
        await tx.delete(recentSearches).where(
          sql`${recentSearches.id} IN (${sql.join(
            searchesToDelete.map((s) => s.id),
            sql`, `,
          )})`,
        );
      }
    }
  });
}

export async function deleteRecentSearch(userId: string, searchId: number) {
  await db.delete(recentSearches).where(and(eq(recentSearches.id, searchId), eq(recentSearches.userId, userId)));
}

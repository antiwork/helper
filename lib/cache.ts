import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { cache as cacheTable } from "@/db/schema/cache";

export const cacheFor = <T>(key: string) => ({
  get: async (): Promise<T | null> => {
    const result = await db.query.cache.findFirst({ where: eq(cacheTable.key, key) });
    if (result && (!result.expiresAt || result.expiresAt > new Date())) {
      return result.value as T;
    }
    return null;
  },
  set: async (value: T, expirySeconds: number | null = null) => {
    const expiresAt = expirySeconds ? new Date(Date.now() + expirySeconds * 1000) : null;
    await db.insert(cacheTable).values({ key, value, expiresAt }).onConflictDoUpdate({
      target: cacheTable.key,
      set: { value, expiresAt },
    });
  },
});

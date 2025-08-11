import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { ToolRequestBody } from "@helperai/client";
import { db } from "@/db/client";
import { cachedClientTools } from "@/db/schema";

/**
 * Delete cached tools for a specific customer or global fallback.
 */
async function clearCachedTools(customerEmailOrId?: string | number | null, tx: typeof db = db) {
  if (typeof customerEmailOrId === "number") {
    await tx.delete(cachedClientTools).where(eq(cachedClientTools.platformCustomerId, customerEmailOrId));
  } else if (typeof customerEmailOrId === "string") {
    await tx.delete(cachedClientTools).where(eq(cachedClientTools.customerEmail, customerEmailOrId));
  } else {
    await tx
      .delete(cachedClientTools)
      .where(and(isNull(cachedClientTools.customerEmail), isNull(cachedClientTools.platformCustomerId)));
  }
}

/**
 * Cache only server-backed tools. If tools are undefined or empty, clears cache.
 */
export const cacheClientTools = async (
  tools: Record<string, ToolRequestBody> | undefined,
  customerEmailOrId?: string | number | null,
) => {
  // If no tools provided, clear cache and exit
  if (!tools) {
    await clearCachedTools(customerEmailOrId);
    return;
  }

  const serverTools = Object.fromEntries(Object.entries(tools).filter(([, tool]) => (tool as any)?.serverRequestUrl));

  if (Object.keys(serverTools).length === 0) {
    await clearCachedTools(customerEmailOrId);
    return;
  }

  let platformCustomerId: number | null = null;
  let customerEmail: string | null = null;

  if (typeof customerEmailOrId === "number") {
    platformCustomerId = customerEmailOrId;
  } else if (typeof customerEmailOrId === "string") {
    customerEmail = customerEmailOrId;
  }

  await db.transaction(async (tx) => {
    if (platformCustomerId) {
      await tx
        .insert(cachedClientTools)
        .values({ platformCustomerId, customerEmail: null, tools: serverTools })
        .onConflictDoUpdate({
          target: [cachedClientTools.platformCustomerId],
          set: { tools: serverTools, updatedAt: new Date() },
        });
    } else if (customerEmail) {
      await tx
        .insert(cachedClientTools)
        .values({ platformCustomerId: null, customerEmail, tools: serverTools })
        .onConflictDoUpdate({
          target: [cachedClientTools.customerEmail],
          set: { tools: serverTools, updatedAt: new Date() },
        });
    } else {
      // Global fallback: clear existing then insert new
      await clearCachedTools(null, tx);
      await tx.insert(cachedClientTools).values({
        platformCustomerId: null,
        customerEmail: null,
        tools: serverTools,
      });
    }
  });
};

/**
 * Retrieve cached tools for a specific customer (prefer platform ID).
 */
export const getCachedClientTools = async (
  customerEmailOrId?: string | number | null,
): Promise<Record<string, ToolRequestBody> | null> => {
  if (typeof customerEmailOrId === "number") {
    const byPlatform = await db.query.cachedClientTools.findFirst({
      where: eq(cachedClientTools.platformCustomerId, customerEmailOrId),
    });
    if (byPlatform?.tools) return byPlatform.tools;
  } else if (typeof customerEmailOrId === "string") {
    const byEmail = await db.query.cachedClientTools.findFirst({
      where: eq(cachedClientTools.customerEmail, customerEmailOrId),
    });
    if (byEmail?.tools) return byEmail.tools;
  }
  // Global fallback
  const globalRecord = await db.query.cachedClientTools.findFirst({
    where: and(isNull(cachedClientTools.customerEmail), isNull(cachedClientTools.platformCustomerId)),
  });
  return globalRecord?.tools ?? null;
};

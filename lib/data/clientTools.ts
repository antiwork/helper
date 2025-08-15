import "server-only";
import { eq, isNull } from "drizzle-orm";
import type { ToolRequestBody } from "@helperai/client";
import { db } from "@/db/client";
import { cachedClientTools } from "@/db/schema";

async function clearCachedTools(customerEmail?: string | null, tx: typeof db = db) {
  if (typeof customerEmail === "string") {
    await tx.delete(cachedClientTools).where(eq(cachedClientTools.customerEmail, customerEmail));
  } else {
    await tx.delete(cachedClientTools).where(isNull(cachedClientTools.customerEmail));
  }
}

export const cacheClientTools = async (
  tools: Record<string, ToolRequestBody> | undefined,
  customerEmail?: string | null,
) => {
  if (!tools) {
    await clearCachedTools(customerEmail);
    return;
  }

  const serverTools = Object.fromEntries(Object.entries(tools).filter(([, tool]) => (tool as any)?.serverRequestUrl));

  if (Object.keys(serverTools).length === 0) {
    await clearCachedTools(customerEmail);
    return;
  }

  await db.transaction(async (tx) => {
    if (customerEmail) {
      await tx
        .insert(cachedClientTools)
        .values({ customerEmail, tools: serverTools })
        .onConflictDoUpdate({
          target: [cachedClientTools.customerEmail],
          set: { tools: serverTools, updatedAt: new Date() },
        });
    } else {
      await clearCachedTools(null, tx);
      await tx.insert(cachedClientTools).values({
        customerEmail: null,
        tools: serverTools,
      });
    }
  });
};

export const getCachedClientTools = async (
  customerEmail?: string | null,
): Promise<Record<string, ToolRequestBody> | null> => {
  if (typeof customerEmail === "string") {
    const byEmail = await db.query.cachedClientTools.findFirst({
      where: eq(cachedClientTools.customerEmail, customerEmail),
    });
    if (byEmail?.tools) return byEmail.tools;
  }
  const globalRecord = await db.query.cachedClientTools.findFirst({
    where: isNull(cachedClientTools.customerEmail),
  });
  return globalRecord?.tools ?? null;
};

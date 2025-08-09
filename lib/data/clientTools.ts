import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { cachedClientTools, platformCustomers } from "@/db/schema";
import { ToolRequestBody } from "@helperai/client";

export const cacheClientTools = async (
  tools: Record<string, ToolRequestBody> | undefined,
  customerEmail?: string | null,
) => {
  if (!tools) return;
  const serverTools = Object.fromEntries(
    Object.entries(tools).filter(([, tool]) => tool.serverRequestUrl),
  );
  if (Object.keys(serverTools).length === 0) return;

  let platformCustomerId: number | null = null;
  if (customerEmail) {
    const platformCustomer = await db.query.platformCustomers.findFirst({
      columns: { id: true },
      where: eq(platformCustomers.email, customerEmail),
    });
    platformCustomerId = platformCustomer?.id ?? null;
  }

  await db.transaction(async (tx) => {
    if (customerEmail) {
      await tx
        .delete(cachedClientTools)
        .where(eq(cachedClientTools.customerEmail, customerEmail));
      await tx.insert(cachedClientTools).values({
        customerEmail,
        platformCustomerId,
        tools: serverTools,
      });
    } else {
      await tx
        .delete(cachedClientTools)
        .where(
          and(
            isNull(cachedClientTools.customerEmail),
            isNull(cachedClientTools.platformCustomerId),
          ),
        );
      await tx.insert(cachedClientTools).values({
        customerEmail: null,
        platformCustomerId: null,
        tools: serverTools,
      });
    }
  });
};

export const getCachedClientTools = async (
  customerEmail?: string | null,
): Promise<Record<string, ToolRequestBody> | null> => {
  if (customerEmail) {
    const record = await db.query.cachedClientTools.findFirst({
      where: eq(cachedClientTools.customerEmail, customerEmail),
    });
    if (record) return record.tools as Record<string, ToolRequestBody>;
  }
  const globalRecord = await db.query.cachedClientTools.findFirst({
    where: and(
      isNull(cachedClientTools.customerEmail),
      isNull(cachedClientTools.platformCustomerId),
    ),
  });
  return globalRecord ? (globalRecord.tools as Record<string, ToolRequestBody>) : null;
};

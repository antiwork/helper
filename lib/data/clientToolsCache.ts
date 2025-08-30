import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type { ToolRequestBody } from "@helperai/client";
import { db, Transaction } from "@/db/client";
import { clientToolsCache } from "@/db/schema";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export interface CacheClientToolsParams {
  tools: Record<string, ToolRequestBody>;
  customerEmail?: string | null;
  platformCustomerId?: string | null;
}

export interface GetCachedClientToolsParams {
  customerEmail?: string | null;
  platformCustomerId?: string | null;
}

export const cacheClientTools = async ({
  tools,
  customerEmail,
  platformCustomerId,
}: CacheClientToolsParams): Promise<void> => {
  const serverTools = Object.entries(tools).filter(([_, tool]: [string, ToolRequestBody]) => tool.serverRequestUrl);

  if (serverTools.length === 0) {
    return;
  }

  for (const toolEntry of serverTools) {
    const [toolName, tool] = toolEntry;

    try {
      await db
        .insert(clientToolsCache)
        .values({
          toolName,
          description: tool.description || "",
          parameters: tool.parameters || {},
          serverRequestUrl: tool.serverRequestUrl!,
          customerEmail: customerEmail || "", // Empty string instead of NULL
          platformCustomerId: platformCustomerId || "", // Empty string instead of NULL
        })
        .onConflictDoUpdate({
          target: [clientToolsCache.toolName, clientToolsCache.customerEmail, clientToolsCache.platformCustomerId],
          set: {
            description: tool.description || "",
            parameters: tool.parameters || {},
            serverRequestUrl: tool.serverRequestUrl!,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      captureExceptionAndLog(error);
      throw error;
    }
  }
};

export const getCachedClientTools = async ({
  customerEmail,
  platformCustomerId,
}: GetCachedClientToolsParams): Promise<Record<string, ToolRequestBody>> => {
  const scopedFilters: any[] = [];
  if (customerEmail) scopedFilters.push(eq(clientToolsCache.customerEmail, customerEmail));
  if (platformCustomerId) scopedFilters.push(eq(clientToolsCache.platformCustomerId, platformCustomerId));

  let cachedTools =
    customerEmail || platformCustomerId
      ? await db.query.clientToolsCache.findMany({
          where: and(...scopedFilters),
        })
      : [];

  if (cachedTools.length === 0) {
    cachedTools = await db.query.clientToolsCache.findMany({
      where: and(eq(clientToolsCache.customerEmail, ""), eq(clientToolsCache.platformCustomerId, "")),
    });
  }

  return Object.fromEntries(
    cachedTools.map((tool) => [
      tool.toolName,
      {
        description: tool.description,
        parameters: tool.parameters,
        serverRequestUrl: tool.serverRequestUrl,
      } satisfies ToolRequestBody,
    ]),
  );
};

export const clearCachedClientTools = async ({
  customerEmail,
  platformCustomerId,
}: GetCachedClientToolsParams): Promise<void> => {
  const where: any[] = [];
  if (customerEmail) where.push(eq(clientToolsCache.customerEmail, customerEmail));
  if (platformCustomerId) where.push(eq(clientToolsCache.platformCustomerId, platformCustomerId));

  // If no identifiers provided, target global entries
  if (where.length === 0) {
    where.push(eq(clientToolsCache.customerEmail, ""), eq(clientToolsCache.platformCustomerId, ""));
  }

  await db.delete(clientToolsCache).where(and(...where));
};

export const getCachedToolsForAdmin = async (tx: Transaction | typeof db = db) => {
  return await tx.query.clientToolsCache.findMany({
    columns: {
      toolName: true,
      description: true,
      parameters: true,
      serverRequestUrl: true,
      customerEmail: true,
      platformCustomerId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [clientToolsCache.createdAt],
  });
};

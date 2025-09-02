import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import type { ToolRequestBody } from "@helperai/client";
import { db, Transaction } from "@/db/client";
import { clientToolsCache } from "@/db/schema";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export interface CacheClientToolsParams {
  tools: Record<string, ToolRequestBody>;
  customerEmail?: string | null;
}

export interface GetCachedClientToolsParams {
  customerEmail?: string | null;
}

export const cacheClientTools = async ({ tools, customerEmail }: CacheClientToolsParams): Promise<void> => {
  const serverTools = Object.entries(tools).filter(([_, tool]: [string, ToolRequestBody]) => tool.serverRequestUrl);

  if (serverTools.length === 0) return;

  const values = serverTools.map(([toolName, tool]) => ({
    toolName,
    description: tool.description || "",
    parameters: tool.parameters || {},
    serverRequestUrl: tool.serverRequestUrl!,
    customerEmail: customerEmail || null,
  }));

  try {
    await db
      .insert(clientToolsCache)
      .values(values)
      .onConflictDoUpdate({
        target: [clientToolsCache.toolName, clientToolsCache.customerEmail],
        set: {
          description: sql`excluded.description`,
          parameters: sql`excluded.parameters`,
          serverRequestUrl: sql`excluded.server_request_url`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  } catch (error) {
    captureExceptionAndLog(error);
    throw error;
  }
};

export const getCachedClientTools = async ({
  customerEmail,
}: GetCachedClientToolsParams): Promise<Record<string, ToolRequestBody>> => {
  const scopedFilters: any[] = [];
  if (customerEmail) scopedFilters.push(eq(clientToolsCache.customerEmail, customerEmail));

  let cachedTools = customerEmail
    ? await db.query.clientToolsCache.findMany({
        where: and(...scopedFilters),
      })
    : [];

  if (cachedTools.length === 0) {
    cachedTools = await db.query.clientToolsCache.findMany({
      where: isNull(clientToolsCache.customerEmail),
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

export const clearCachedClientTools = async ({ customerEmail }: GetCachedClientToolsParams): Promise<void> => {
  const where: any[] = [];
  if (customerEmail) where.push(eq(clientToolsCache.customerEmail, customerEmail));

  // If no identifiers provided, target global entries
  if (where.length === 0) {
    where.push(isNull(clientToolsCache.customerEmail));
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
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [clientToolsCache.createdAt],
  });
};

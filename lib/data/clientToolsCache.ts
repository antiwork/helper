import "server-only";
import { and, eq, isNull, or } from "drizzle-orm";
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
      // First try to find existing record
      const existingTool = await db.query.clientToolsCache.findFirst({
        where: and(
          eq(clientToolsCache.toolName, toolName),
          eq(clientToolsCache.unused_mailboxId, 0),
          customerEmail ? eq(clientToolsCache.customerEmail, customerEmail) : isNull(clientToolsCache.customerEmail),
          platformCustomerId
            ? eq(clientToolsCache.platformCustomerId, platformCustomerId)
            : isNull(clientToolsCache.platformCustomerId),
        ),
      });

      if (existingTool) {
        // Update existing record
        await db
          .update(clientToolsCache)
          .set({
            description: tool.description || "",
            parameters: tool.parameters || {},
            serverRequestUrl: tool.serverRequestUrl!,
            updatedAt: new Date(),
          })
          .where(eq(clientToolsCache.id, existingTool.id));
      } else {
        // Insert new record
        await db.insert(clientToolsCache).values({
          toolName,
          description: tool.description || "",
          parameters: tool.parameters || {},
          serverRequestUrl: tool.serverRequestUrl!,
          customerEmail: customerEmail || null,
          platformCustomerId: platformCustomerId || null,
          unused_mailboxId: 0,
        });
      }
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
  let cachedTools = await db.query.clientToolsCache.findMany({
    where: or(
      eq(clientToolsCache.customerEmail, customerEmail || ""),
      eq(clientToolsCache.platformCustomerId, platformCustomerId || ""),
    ),
  });

  if (cachedTools.length === 0) {
    cachedTools = await db.query.clientToolsCache.findMany({
      where: and(isNull(clientToolsCache.customerEmail), isNull(clientToolsCache.platformCustomerId)),
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
  const whereConditions = [];

  if (customerEmail) {
    whereConditions.push(eq(clientToolsCache.customerEmail, customerEmail));
  } else if (platformCustomerId) {
    whereConditions.push(eq(clientToolsCache.platformCustomerId, platformCustomerId));
  } else {
    whereConditions.push(isNull(clientToolsCache.customerEmail));
    whereConditions.push(isNull(clientToolsCache.platformCustomerId));
  }

  await db.delete(clientToolsCache).where(and(...whereConditions));
};

export const getCachedToolsForAdmin = async (
  tx: Transaction | typeof db = db,
): Promise<
  {
    toolName: string;
    description: string;
    parameters: Record<string, any>;
    serverRequestUrl: string;
    customerEmail: string | null;
    platformCustomerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }[]
> => {
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

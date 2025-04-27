import "server-only";
import { and, eq } from "drizzle-orm";
import { db, Transaction } from "@/db/client";
import { tools as toolsTable } from "@/db/schema";
import type { Tool } from "@/db/schema/tools";
import { parseToolsFromOpenAPISpec } from "@/lib/tools/openApiParser";
import type { Mailbox } from "./mailbox";

export const getMailboxToolsForChat = async (mailbox: Mailbox, tx: Transaction | typeof db = db): Promise<Tool[]> => {
  return await tx.query.tools.findMany({
    where: and(
      eq(toolsTable.mailboxId, mailbox.id),
      eq(toolsTable.enabled, true),
      eq(toolsTable.availableInChat, true),
    ),
  });
};

export const fetchOpenApiSpec = async (url: string, apiKey: string | null): Promise<string> => {
  const response = await fetch(url, {
    headers: apiKey
      ? {
          Authorization: `Bearer ${apiKey}`,
        }
      : {},
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch API spec from URL: ${response.statusText}`);
  }

  return response.text();
};

export const importToolsFromSpec = async ({
  mailboxId,
  toolApiId,
  openApiSpec,
  apiKey,
}: {
  mailboxId: number;
  toolApiId: number;
  openApiSpec: string;
  apiKey: string;
}) => {
  const tools = await parseToolsFromOpenAPISpec(openApiSpec, apiKey);
  const existingTools = await db.query.tools.findMany({
    where: eq(toolsTable.toolApiId, toolApiId),
  });

  const existingSlugs = new Set(existingTools.map((tool) => tool.slug));
  const toolsToUpdate = tools.filter((tool) => existingSlugs.has(tool.slug));
  const toolsToInsert = tools.filter((tool) => !existingSlugs.has(tool.slug));

  for (const tool of toolsToUpdate) {
    const existingTool = existingTools.find((t) => t.slug === tool.slug);
    await db
      .update(toolsTable)
      .set({
        ...tool,
        enabled: existingTool?.enabled ?? true,
        availableInChat: existingTool?.availableInChat ?? false,
        updatedAt: new Date(),
      })
      .where(eq(toolsTable.slug, tool.slug));
  }

  if (toolsToInsert.length > 0) {
    await db.insert(toolsTable).values(
      toolsToInsert.map((tool) => ({
        ...tool,
        mailboxId,
        toolApiId,
      })),
    );
  }

  return { toolsToUpdate, toolsToInsert };
};

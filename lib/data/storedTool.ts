import { sql } from "drizzle-orm";
import { ToolRequestBody } from "@helperai/client";
import { db } from "@/db/client";
import { storedTools } from "@/db/schema/storedTools";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const storeTools = async (customerEmail: string | null, tools: Record<string, ToolRequestBody>) => {
  try {
    const serverTools = Object.fromEntries(Object.entries(tools).filter(([, tool]) => !!tool.serverRequestUrl));

    if (Object.keys(serverTools).length === 0) return;

    const values = Object.entries(serverTools).map(([name, tool]) => ({
      customerEmail: customerEmail || null,
      name,
      description: tool.description,
      parameters: Object.entries(tool.parameters).map(([name, param]) => ({
        ...param,
        name,
        optional: param.optional ?? false,
        description: param.description ?? null,
      })),
      serverRequestUrl: tool.serverRequestUrl,
    }));

    await db
      .insert(storedTools)
      .values(values)
      .onConflictDoUpdate({
        target: [storedTools.name, storedTools.customerEmail],
        set: {
          description: sql`excluded.description`,
          parameters: sql`excluded.parameters`,
          serverRequestUrl: sql`excluded.server_request_url`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  } catch (error) {
    return captureExceptionAndLog(error);
  }
};

export const fetchStoredTools = async (customerEmail: string | null) => {
  const tools = await db.query.storedTools.findMany({
    columns: { name: true, description: true, parameters: true, serverRequestUrl: true },
    where: (fields, operators) =>
      customerEmail ? operators.eq(fields.customerEmail, customerEmail) : operators.isNull(fields.customerEmail),
  });

  return tools;
};

import { sql } from "drizzle-orm";
import { ToolRequestBody } from "@helperai/client";
import { db } from "@/db/client";
import { clientTools } from "@/db/schema/clientTools";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export const importClientTools = async (customerEmail: string | null, tools: Record<string, ToolRequestBody>) => {
  try {
    const serverTools = Object.fromEntries(Object.entries(tools).filter(([, tool]) => tool.serverRequestUrl));

    if (Object.keys(serverTools).length === 0) return;

    const values = Object.entries(serverTools).map(([name, tool]) => ({
      customerEmail: customerEmail || null,
      name: name,
      description: tool.description,
      parameters: Object.entries(tool.parameters).map(([name, param]) => ({
        name,
        ...param,
      })),
      serverRequestUrl: tool.serverRequestUrl,
    }));

    await db
      .insert(clientTools)
      .values(values)
      .onConflictDoUpdate({
        target: [clientTools.name, clientTools.customerEmail],
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

export const fetchClientTools = async (customerEmail: string | null) => {
  const tools = await db.query.clientTools.findMany({
    columns: { name: true, description: true, parameters: true, serverRequestUrl: true },
    where: (fields, operators) =>
      customerEmail ? operators.eq(fields.customerEmail, customerEmail) : operators.isNull(fields.customerEmail),
  });

  return tools;
};

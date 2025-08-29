import { sql } from "drizzle-orm";
import { ToolRequestBody } from "@helperai/client";
import { db } from "@/db/client";
import { clientTools } from "@/db/schema/clientTools";

export const importClientTools = async (customerEmail: string | null, tools: Record<string, ToolRequestBody>) => {
  const serverTools = Object.fromEntries(Object.entries(tools).filter(([, tool]) => tool.serverRequestUrl));

  if (Object.keys(serverTools).length === 0) return;

  const values = Object.entries(serverTools).map(([toolName, tool]) => ({
    customer_email: customerEmail || null,
    tool_name: toolName,
    tool,
  }));

  await db.transaction(async (tx) => {
    await tx
      .insert(clientTools)
      .values(values)
      .onConflictDoUpdate({
        target: [clientTools.tool_name, clientTools.customer_email],
        set: {
          tool: sql`excluded.tool`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  });
};

export const fetchClientTools = async (customerEmail: string | null) => {
  const tools = await db.query.clientTools.findMany({
    columns: { tool: true, tool_name: true },
    where: (fields, operators) =>
      customerEmail
        ? operators.eq(fields.customer_email, customerEmail)
        : operators.isNull(fields.customer_email),
  });

  return tools.map((t) => ({ ...t.tool, name: t.tool_name }));
};

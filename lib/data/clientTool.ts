import { ToolRequestBody } from "@helperai/client";
import { db} from "@/db/client";
import { sql } from "drizzle-orm";
import { clientTools } from "@/db/schema/clientTools";


export const importClientTools = async (customerEmail: string | null, tools: Record<string, ToolRequestBody>) => {
  const serverTools = Object.fromEntries(Object.entries(tools).filter(([, tool]) => tool.serverRequestUrl));

  if (Object.keys(serverTools).length === 0) return;

  await db.transaction(async (tx) => {
    for (const [toolName, tool] of Object.entries(serverTools)) {
        await tx.insert(clientTools)
        .values({ customer_email: customerEmail, tool_name: toolName, tool })
        .onConflictDoUpdate({
          target: [clientTools.customer_email, clientTools.tool_name],
          set: { tool: tool, updatedAt: new Date() },
        });
    }
  });
};

export const fetchClientTools = async (customerEmail: string | null) => {
const tools = await db.query.clientTools.findMany({
    columns: { tool: true, tool_name: true },
    where: customerEmail
        ? sql`${clientTools.customer_email} = ${customerEmail}`
        : sql`${clientTools.customer_email} IS NULL`,
});
return tools.map(t => ({ ...t.tool, name: t.tool_name }));
};
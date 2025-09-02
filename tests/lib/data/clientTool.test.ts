import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { ToolRequestBody } from "@helperai/client";
import { db } from "@/db/client";
import { clientTools } from "@/db/schema/clientTools";
import { fetchClientTools, importClientTools } from "@/lib/data/clientTool";

describe("importClientTools", () => {
  it("does nothing if no server tools are provided", async () => {
    await importClientTools("user@example.com", {
      toolA: { description: "desc", parameters: {}, serverRequestUrl: undefined },
    });
    const tools = await db.select().from(clientTools).execute();
    expect(tools.length).toBe(0);
  });

  it("inserts tools with serverRequestUrl", async () => {
    const tool: ToolRequestBody = {
      description: "desc",
      parameters: {},
      serverRequestUrl: "https://api.example.com/tool",
    };
    await importClientTools("user@example.com", { toolA: tool });
    const tools = await db.select().from(clientTools).execute();
    expect(tools.length).toBe(1);
    expect(tools[0]?.name).toBe("toolA");
    expect(tools[0]?.customerEmail).toBe("user@example.com");
  });
  it("overrides existing tool for same customer and tool_name", async () => {
    const initialTool: ToolRequestBody = {
      description: "initial",
      parameters: {},
      serverRequestUrl: "https://api.example.com/tool",
    };
    const updatedTool: ToolRequestBody = {
      description: "updated",
      parameters: {},
      serverRequestUrl: "https://api.example.com/updated",
    };

    await importClientTools("override@example.com", { toolA: initialTool });
    await importClientTools("override@example.com", { toolA: updatedTool });

    const tools = await db
      .select()
      .from(clientTools)
      .where(and(eq(clientTools.customerEmail, "override@example.com"), eq(clientTools.name, "toolA")))
      .execute();

    expect(tools.length).toBe(1);
    expect(tools[0]?.description).toBe("updated");
    expect(tools[0]?.serverRequestUrl).toBe("https://api.example.com/updated");
  });

  it("sets customer_email to null if not provided", async () => {
    const tool: ToolRequestBody = {
      description: "desc",
      parameters: {},
      serverRequestUrl: "https://api.example.com/tool",
    };
    await importClientTools(null, { toolA: tool });
    const tools = await db.select().from(clientTools).execute();
    expect(tools.length).toBe(1);
    expect(tools[0]?.customerEmail).toBeNull();
  });
});

describe("fetchClientTools", () => {
  it("fetches tools for a specific customer", async () => {
    await db
      .insert(clientTools)
      .values({
        customerEmail: "fetch-user@example.com",
        name: "toolA",
        description: "desc",
        parameters: [],
        serverRequestUrl: "url",
      })
      .execute();

    const result = await fetchClientTools("fetch-user@example.com");
    expect(result).toEqual([{ description: "desc", parameters: [], serverRequestUrl: "url", name: "toolA" }]);
  });

  it("fetches tools for null customer", async () => {
    await db
      .insert(clientTools)
      .values({
        customerEmail: null,
        name: "toolA",
        description: "desc",
        parameters: [],
        serverRequestUrl: "url",
      })
      .execute();

    const result = await fetchClientTools(null);
    expect(result).toEqual([{ description: "desc", parameters: [], serverRequestUrl: "url", name: "toolA" }]);
  });

  it("returns empty array if no tools found", async () => {
    const result = await fetchClientTools("fetch-user@example.com");
    expect(result).toEqual([]);
  });
});

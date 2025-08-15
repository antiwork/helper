import { describe, expect, it } from "vitest";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { cachedClientTools } from "@/db/schema";
import { cacheClientTools, getCachedClientTools } from "@/lib/data/clientTools";

const serverTool = {
  parameters: {},
  serverRequestUrl: "https://example.com/tool",
} as any;

const clientTool = {
  parameters: {},
} as any;

describe("cacheClientTools", () => {
  it("stores only server tools for a customer", async () => {
    await cacheClientTools({ server: serverTool, client: clientTool }, "user@example.com");

    const record = await db.query.cachedClientTools.findFirst({
      where: eq(cachedClientTools.customerEmail, "user@example.com"),
    });

    expect(record?.tools).toEqual({ server: serverTool });

    const result = await getCachedClientTools("user@example.com");
    expect(result).toEqual({ server: serverTool });
  });

  it("clears cached tools when no server tools are provided", async () => {
    await cacheClientTools({ server: serverTool }, "user@example.com");

    await cacheClientTools({ client: clientTool }, "user@example.com");

    const record = await db.query.cachedClientTools.findFirst({
      where: eq(cachedClientTools.customerEmail, "user@example.com"),
    });
    expect(record).toBeUndefined();

    const result = await getCachedClientTools("user@example.com");
    expect(result).toBeNull();
  });

  it("returns global tools when customer-specific entry is missing", async () => {
    await cacheClientTools({ server: serverTool }, null);

    const record = await db.query.cachedClientTools.findFirst({
      where: isNull(cachedClientTools.customerEmail),
    });
    expect(record?.tools).toEqual({ server: serverTool });

    const result = await getCachedClientTools("unknown@example.com");
    expect(result).toEqual({ server: serverTool });
  });
});


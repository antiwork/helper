import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import type { ToolRequestBody } from "@helperai/client";
import { db } from "@/db/client";
import { clientToolsCache } from "@/db/schema";
import {
  cacheClientTools,
  clearCachedClientTools,
  getCachedClientTools,
  getCachedToolsForAdmin,
} from "@/lib/data/clientToolsCache";

describe("clientToolsCache", () => {
  beforeEach(async () => {
    await userFactory.createRootUser();
  });

  const mockTools: Record<string, ToolRequestBody> = {
    testTool: {
      description: "Test tool",
      parameters: {
        param1: { type: "string", description: "Test parameter" },
      },
      serverRequestUrl: "https://api.example.com/test",
    },
    clientTool: {
      description: "Client-side tool",
      parameters: {},
      // No serverRequestUrl - should be filtered out
    },
  };

  describe("cacheClientTools", () => {
    it("should cache only server-side tools", async () => {
      await cacheClientTools({
        tools: mockTools,
        customerEmail: "test@example.com",
      });

      // Verify the tool was cached
      const cachedTool = await db.query.clientToolsCache.findFirst({
        where: eq(clientToolsCache.toolName, "testTool"),
      });

      expect(cachedTool).toMatchObject({
        toolName: "testTool",
        description: "Test tool",
        parameters: { param1: { type: "string", description: "Test parameter" } },
        serverRequestUrl: "https://api.example.com/test",
        customerEmail: "test@example.com",
      });
    });

    it("should filter out client-side tools", async () => {
      await cacheClientTools({
        tools: mockTools,
      });

      // Should only cache testTool, not clientTool
      const cachedTools = await db.query.clientToolsCache.findMany();
      expect(cachedTools).toHaveLength(1);
      expect(cachedTools[0]?.toolName).toBe("testTool");
    });

    it("should handle empty tools", async () => {
      await cacheClientTools({
        tools: {},
      });

      const cachedTools = await db.query.clientToolsCache.findMany();
      expect(cachedTools).toHaveLength(0);
    });

    it("should cache global tools when no customer email provided", async () => {
      await cacheClientTools({
        tools: mockTools,
        // No customerEmail - should cache as global
      });

      const cachedTool = await db.query.clientToolsCache.findFirst({
        where: eq(clientToolsCache.toolName, "testTool"),
      });

      expect(cachedTool).toMatchObject({
        toolName: "testTool",
        customerEmail: null, // Should be null for global tools
      });
    });

    it("should overwrite existing cache when tool already exists", async () => {
      // First cache with one description
      await cacheClientTools({
        tools: {
          testTool: {
            description: "Original description",
            parameters: {},
            serverRequestUrl: "https://api.example.com/test",
          },
        },
        customerEmail: "test@example.com",
      });

      // Cache again with updated description
      await cacheClientTools({
        tools: {
          testTool: {
            description: "Updated description",
            parameters: {},
            serverRequestUrl: "https://api.example.com/test",
          },
        },
        customerEmail: "test@example.com",
      });

      // Check for the specific record with the customer email
      const cachedTool = await db.query.clientToolsCache.findFirst({
        where: eq(clientToolsCache.customerEmail, "test@example.com"),
      });

      expect(cachedTool?.description).toBe("Updated description");
    });
  });

  describe("getCachedClientTools", () => {
    it("should return customer-specific tools when available", async () => {
      // First cache a customer-specific tool
      await cacheClientTools({
        tools: mockTools,
        customerEmail: "customer@example.com",
      });

      const result = await getCachedClientTools({
        customerEmail: "customer@example.com",
      });

      expect(result).toHaveProperty("testTool");
      expect(result.testTool).toMatchObject({
        description: "Test tool",
        parameters: { param1: { type: "string", description: "Test parameter" } },
        serverRequestUrl: "https://api.example.com/test",
      });
    });

    it("should fall back to global tools when no customer-specific tools", async () => {
      // Cache a global tool (no customer email)
      await cacheClientTools({
        tools: mockTools,
      });

      const result = await getCachedClientTools({
        customerEmail: "customer@example.com",
      });

      expect(result).toHaveProperty("testTool");
      expect(result.testTool).toMatchObject({
        description: "Test tool",
        parameters: { param1: { type: "string", description: "Test parameter" } },
        serverRequestUrl: "https://api.example.com/test",
      });
    });

    it("should return empty object when no tools found", async () => {
      const result = await getCachedClientTools({
        customerEmail: "nonexistent@example.com",
      });

      expect(result).toEqual({});
    });

    it("should prioritize customer-specific tools over global tools", async () => {
      // Cache a global tool first
      await cacheClientTools({
        tools: {
          testTool: {
            description: "Global tool",
            parameters: {},
            serverRequestUrl: "https://api.example.com/global",
          },
        },
      });

      // Cache a customer-specific tool with same name
      await cacheClientTools({
        tools: {
          testTool: {
            description: "Customer-specific tool",
            parameters: {},
            serverRequestUrl: "https://api.example.com/customer",
          },
        },
        customerEmail: "customer@example.com",
      });

      const result = await getCachedClientTools({
        customerEmail: "customer@example.com",
      });

      expect(result.testTool).toBeDefined();
      expect(result.testTool?.description).toBe("Customer-specific tool");
      expect(result.testTool?.serverRequestUrl).toBe("https://api.example.com/customer");
    });
  });

  describe("clearCachedClientTools", () => {
    it("should clear customer-specific tools", async () => {
      // Cache a customer-specific tool
      await cacheClientTools({
        tools: mockTools,
        customerEmail: "customer@example.com",
      });

      // Verify it was cached
      let cachedTools = await db.query.clientToolsCache.findMany();
      expect(cachedTools).toHaveLength(1);

      // Clear it
      await clearCachedClientTools({
        customerEmail: "customer@example.com",
      });

      // Verify it was cleared
      cachedTools = await db.query.clientToolsCache.findMany();
      expect(cachedTools).toHaveLength(0);
    });

    it("should clear global tools when no customer specified", async () => {
      // Cache a global tool
      await cacheClientTools({
        tools: mockTools,
      });

      // Verify it was cached
      let cachedTools = await db.query.clientToolsCache.findMany();
      expect(cachedTools).toHaveLength(1);

      // Clear global tools
      await clearCachedClientTools({});

      // Verify it was cleared
      cachedTools = await db.query.clientToolsCache.findMany();
      expect(cachedTools).toHaveLength(0);
    });
  });

  describe("getCachedToolsForAdmin", () => {
    it("should return all cached tools for admin view", async () => {
      // Cache some tools
      await cacheClientTools({
        tools: mockTools,
        customerEmail: "customer@example.com",
      });

      const result = await getCachedToolsForAdmin();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        toolName: "testTool",
        description: "Test tool",
        parameters: { param1: { type: "string", description: "Test parameter" } },
        serverRequestUrl: "https://api.example.com/test",
        customerEmail: "customer@example.com",
      });
      expect(result[0]).toHaveProperty("createdAt");
      expect(result[0]).toHaveProperty("updatedAt");
    });
  });
});

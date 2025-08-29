import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolRequestBody } from "@helperai/client";

// Mock the data functions
vi.mock("@/lib/data/clientToolsCache", () => ({
  cacheClientTools: vi.fn(),
  getCachedClientTools: vi.fn(),
}));

// Mock other dependencies
vi.mock("@/lib/ai/chat", () => ({
  createUserMessage: vi.fn().mockResolvedValue({ id: 1 }),
  respondWithAI: vi.fn().mockResolvedValue({}),
}));

// Mock conversation data - we'll override this in specific tests
let mockConversationData: {
  id: number;
  slug: string;
  emailFrom: string | null;
} = {
  id: 1,
  slug: "test-conversation",
  emailFrom: "test@example.com",
};

vi.mock("@/lib/data/conversation", () => ({
  getConversationBySlugAndMailbox: vi.fn().mockImplementation(() => Promise.resolve(mockConversationData)),
}));

// Mock withWidgetAuth to return different sessions based on test
let mockSession: any = { isAnonymous: false, email: "test@example.com" };
let mockMailbox: any = { id: 1, name: "Test Mailbox" };

vi.mock("@/app/api/widget/utils", () => ({
  withWidgetAuth: (handler: any) => (request: any, context: any) => {
    return handler({ request, context }, { session: mockSession, mailbox: mockMailbox });
  },
  corsResponse: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  }),
}));

describe("Chat API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default session and conversation
    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = { id: 1, name: "Test Mailbox" };
    mockConversationData = {
      id: 1,
      slug: "test-conversation",
      emailFrom: "test@example.com",
    };
  });

  it("should cache tools when provided", async () => {
    const { cacheClientTools } = await import("@/lib/data/clientToolsCache");

    const tools: Record<string, ToolRequestBody> = {
      testTool: {
        description: "Test tool",
        parameters: {
          param1: { type: "string", description: "Test parameter" },
        },
        serverRequestUrl: "https://api.example.com/test",
      },
    };

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { content: "Hello" },
        conversationSlug: "test-conversation",
        readPageTool: null,
        guideEnabled: false,
        tools,
        customerSpecificTools: true,
      }),
    });

    const { POST } = await import("@/app/api/chat/route");
    await POST(request, { params: Promise.resolve({}) });

    expect(cacheClientTools).toHaveBeenCalledWith({
      tools,
      customerEmail: "test@example.com",
    });
  });

  it("should retrieve cached tools", async () => {
    const { getCachedClientTools } = await import("@/lib/data/clientToolsCache");

    const cachedTools = {
      cachedTool: {
        description: "Cached tool",
        parameters: {},
        serverRequestUrl: "https://api.example.com/cached",
      },
    };

    vi.mocked(getCachedClientTools).mockResolvedValue(cachedTools);

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { content: "Hello" },
        conversationSlug: "test-conversation",
        readPageTool: null,
        guideEnabled: false,
        tools: {},
      }),
    });

    const { POST } = await import("@/app/api/chat/route");
    await POST(request, { params: Promise.resolve({}) });

    expect(getCachedClientTools).toHaveBeenCalledWith({
      customerEmail: "test@example.com",
    });
  });

  it("should cache tools globally when customerSpecificTools is false", async () => {
    const { cacheClientTools } = await import("@/lib/data/clientToolsCache");

    const tools: Record<string, ToolRequestBody> = {
      testTool: {
        description: "Test tool",
        parameters: {
          param1: { type: "string", description: "Test parameter" },
        },
        serverRequestUrl: "https://api.example.com/test",
      },
    };

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { content: "Hello" },
        conversationSlug: "test-conversation",
        readPageTool: null,
        guideEnabled: false,
        tools,
        customerSpecificTools: false, // Explicitly set to false for global caching
      }),
    });

    const { POST } = await import("@/app/api/chat/route");
    await POST(request, { params: Promise.resolve({}) });

    expect(cacheClientTools).toHaveBeenCalledWith({
      tools,
      customerEmail: undefined, // Should be undefined for global caching
    });
  });

  it("should cache tools globally when customerSpecificTools is not provided", async () => {
    const { cacheClientTools } = await import("@/lib/data/clientToolsCache");

    const tools: Record<string, ToolRequestBody> = {
      testTool: {
        description: "Test tool",
        parameters: {
          param1: { type: "string", description: "Test parameter" },
        },
        serverRequestUrl: "https://api.example.com/test",
      },
    };

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { content: "Hello" },
        conversationSlug: "test-conversation",
        readPageTool: null,
        guideEnabled: false,
        tools,
        // customerSpecificTools not provided - should default to global caching
      }),
    });

    const { POST } = await import("@/app/api/chat/route");
    await POST(request, { params: Promise.resolve({}) });

    expect(cacheClientTools).toHaveBeenCalledWith({
      tools,
      customerEmail: undefined, // Should be undefined for global caching
    });
  });

  it("should handle anonymous sessions", async () => {
    const { getCachedClientTools } = await import("@/lib/data/clientToolsCache");

    // Set anonymous session for this test
    mockSession = { isAnonymous: true, email: null };

    // Set conversation without emailFrom for anonymous session
    mockConversationData = {
      id: 1,
      slug: "test-conversation",
      emailFrom: null, // No emailFrom for anonymous sessions
    };

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { content: "Hello" },
        conversationSlug: "test-conversation",
        readPageTool: null,
        guideEnabled: false,
        tools: {},
      }),
    });

    const { POST } = await import("@/app/api/chat/route");
    await POST(request, { params: Promise.resolve({}) });

    expect(getCachedClientTools).toHaveBeenCalledWith({
      customerEmail: null,
    });
  });

  it("should not cache when no tools provided", async () => {
    const { cacheClientTools } = await import("@/lib/data/clientToolsCache");

    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { content: "Hello" },
        conversationSlug: "test-conversation",
        readPageTool: null,
        guideEnabled: false,
        tools: {},
      }),
    });

    const { POST } = await import("@/app/api/chat/route");
    await POST(request, { params: Promise.resolve({}) });

    expect(cacheClientTools).not.toHaveBeenCalled();
  });
});

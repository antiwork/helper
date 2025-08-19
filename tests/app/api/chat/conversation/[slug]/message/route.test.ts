import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/conversation/[slug]/message/route";
import { triggerEvent } from "@/jobs/trigger";
import { createUserMessage } from "@/lib/ai/chat";

vi.mock("@/lib/ai/chat", () => ({
  createUserMessage: vi.fn(),
}));

vi.mock("@/jobs/trigger", () => ({
  triggerEvent: vi.fn(),
}));

let mockSession: any;
let mockMailbox: any;

vi.mock("@/app/api/widget/utils", async (importOriginal) => ({
  ...(await importOriginal()),
  withWidgetAuth: vi.fn((handler) => (request: Request, context: any) => {
    return handler({ request, context }, { session: mockSession, mailbox: mockMailbox });
  }),
}));

describe("POST /api/chat/conversation/[slug]/message", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(createUserMessage).mockResolvedValue({ id: "msg123" } as any);
    vi.mocked(triggerEvent).mockResolvedValue(undefined);
  });

  it("should create a message successfully with valid content", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messageId).toBe("msg123");
    expect(result.conversationSlug).toBe(conversation.slug);
    expect(createUserMessage).toHaveBeenCalledWith(conversation.id, "test@example.com", "Hello world", []);
    expect(triggerEvent).toHaveBeenCalledWith(
      "conversations/auto-response.create",
      { messageId: "msg123", tools: undefined, metadata: undefined },
      { sleepSeconds: 5 * 60 },
    );
  });

  it("should work with anonymous session", async () => {
    const { mailbox } = await mailboxFactory.create();
    const anonymousSessionId = "anon123";
    const { conversation } = await conversationFactory.create({
      anonymousSessionId,
    });

    mockSession = { isAnonymous: true, anonymousSessionId };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello from anonymous user" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messageId).toBe("msg123");
    expect(createUserMessage).toHaveBeenCalledWith(conversation.id, null, "Hello from anonymous user", []);
  });

  it("should handle attachments correctly", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Message with attachment",
        attachments: [
          {
            name: "test.png",
            url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
            contentType: "image/png",
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    await response.json();

    expect(response.status).toBe(200);
    expect(createUserMessage).toHaveBeenCalledWith(conversation.id, "test@example.com", "Message with attachment", [
      {
        name: "test.png",
        contentType: "image/png",
        data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
      },
    ]);
  });

  it("should return 400 for missing content", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe("Content is required");
  });

  it("should return 401 for invalid session without email or anonymousSessionId", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe("Not authorized - Invalid session");
  });

  it("should return 401 for authenticated session with falsy email", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe("Not authorized - Invalid session");
  });

  it("should return 404 for non-existent conversation", async () => {
    const { mailbox } = await mailboxFactory.create();

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: "non-existent-slug" }),
    });
    const result = await response.json();

    expect(response.status).toBe(404);
    expect(result.error).toBe("Conversation not found");
  });

  it("should return 404 for unauthorized access to conversation", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "other@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world" }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(404);
    expect(result.error).toBe("Conversation not found");
  });

  it("should return 400 for attachment with missing URL", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Message with invalid attachment",
        attachments: [
          {
            name: "test.png",
            url: "",
            contentType: "image/png",
          },
        ],
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe("test.png: Missing URL");
  });

  it("should handle tools correctly", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const tools = {
      testTool: {
        description: "A test tool",
        parameters: {
          param1: { type: "string" as const, description: "Test parameter" },
        },
        serverRequestUrl: "https://example.com/tool",
      },
    };

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Message with tools",
        tools,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messageId).toBe("msg123");
    expect(createUserMessage).toHaveBeenCalledWith(conversation.id, "test@example.com", "Message with tools", []);
    expect(triggerEvent).toHaveBeenCalledWith(
      "conversations/auto-response.create",
      { messageId: "msg123", tools, metadata: undefined },
      { sleepSeconds: 5 * 60 },
    );
  });

  it("should handle metadata correctly", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const metadata = {
      customerId: "12345",
      source: "mobile-app",
      experiments: ["feature-a", "feature-b"],
      sessionData: {
        timestamp: "2023-01-01T00:00:00Z",
        userAgent: "TestAgent/1.0",
      },
    };

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Message with metadata",
        metadata,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messageId).toBe("msg123");
    expect(createUserMessage).toHaveBeenCalledWith(conversation.id, "test@example.com", "Message with metadata", []);
    expect(triggerEvent).toHaveBeenCalledWith(
      "conversations/auto-response.create",
      { messageId: "msg123", tools: undefined, metadata },
      { sleepSeconds: 5 * 60 },
    );
  });

  it("should handle both tools and metadata together", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const tools = {
      analyticsTool: {
        description: "Analytics tracking tool",
        parameters: {
          event: { type: "string" as const, description: "Event name" },
          value: { type: "number" as const, description: "Event value", optional: true },
        },
        serverRequestUrl: "https://example.com/analytics",
      },
    };

    const metadata = {
      customerId: "67890",
      tier: "premium",
      region: "us-west-2",
    };

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Message with both tools and metadata",
        tools,
        metadata,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messageId).toBe("msg123");
    expect(createUserMessage).toHaveBeenCalledWith(conversation.id, "test@example.com", "Message with both tools and metadata", []);
    expect(triggerEvent).toHaveBeenCalledWith(
      "conversations/auto-response.create",
      { messageId: "msg123", tools, metadata },
      { sleepSeconds: 5 * 60 },
    );
  });
});

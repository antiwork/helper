import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/conversation/[slug]/message/route";
import { db } from "@/db/client";
import { mailboxes } from "@/db/schema";
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

    const tools = {
      testServerTool: {
        description: "A tool for testing server functionality",
        parameters: {},
        serverRequestUrl: "https://example.com/api/tools/testServerTool",
      },
    };
    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "Hello world", tools, customerSpecificTools: true }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messageId).toBe("msg123");
    expect(result.conversationSlug).toBe(conversation.slug);
    expect(createUserMessage).toHaveBeenCalledWith(conversation.id, "test@example.com", "Hello world", []);
    expect(triggerEvent).toHaveBeenCalledWith("conversations/auto-response.create", { messageId: "msg123", tools });
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

  it("should pass through tools and customerInfoUrl to triggerEvent", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const tools = { search: { description: "Search the web", parameters: { query: { type: "string" } } } };
    const customerInfoUrl = "https://example.com/customer-info";

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello world",
        tools,
        customerInfoUrl,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.messageId).toBe("msg123");
    expect(triggerEvent).toHaveBeenCalledWith("conversations/auto-response.create", {
      messageId: "msg123",
      tools,
      customerInfoUrl,
    });
  });

  it("should save customerInfoUrl to mailbox when customerSpecificInfoUrl is false", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const customerInfoUrl = "https://example.com/customer-info";

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello world",
        customerInfoUrl,
        customerSpecificInfoUrl: false,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });

    expect(response.status).toBe(200);

    const updatedMailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, mailbox.id),
    });
    expect(updatedMailbox?.customerInfoUrl).toBe(customerInfoUrl);
  });

  it("does not save customerInfoUrl to mailbox when customerSpecificInfoUrl is true", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const customerInfoUrl = "https://example.com/customer-info";

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello world",
        customerInfoUrl,
        customerSpecificInfoUrl: true,
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });

    expect(response.status).toBe(200);

    const updatedMailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, mailbox.id),
    });
    expect(updatedMailbox?.customerInfoUrl).toBeNull();
  });

  it("does not save customerInfoUrl to mailbox when customerInfoUrl is not provided", async () => {
    const { mailbox } = await mailboxFactory.create({
      customerInfoUrl: "https://example.com/customer-info",
    });
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });

    mockSession = { isAnonymous: false, email: "test@example.com" };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "Hello world",
      }),
    });

    const response = await POST(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });

    expect(response.status).toBe(200);

    const updatedMailbox = await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, mailbox.id),
    });
    expect(updatedMailbox?.customerInfoUrl).toBe("https://example.com/customer-info");
  });
});

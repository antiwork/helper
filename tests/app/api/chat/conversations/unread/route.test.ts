import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/chat/conversations/unread/route";

let mockSession: any;
let mockMailbox: any;

vi.mock("@/app/api/widget/utils", async (importOriginal) => ({
  ...(await importOriginal()),
  withWidgetAuth: vi.fn((handler) => (request: Request, _context: any) => {
    return handler({ request }, { session: mockSession, mailbox: mockMailbox });
  }),
}));

describe("GET /api/chat/conversations/unread", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 for invalid session without email or anonymousSessionId", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");
      const { mailbox } = await mailboxFactory.create();
      mockSession = { isAnonymous: false };
      mockMailbox = mailbox;

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Not authorized - Invalid session");
    });

    it("should handle anonymous session with anonymousSessionId", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");
      const { mailbox } = await mailboxFactory.create();
      const anonymousSessionId = "anon123";
      mockSession = { isAnonymous: true, anonymousSessionId };
      mockMailbox = mailbox;

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty("count");
      expect(typeof result.count).toBe("number");
    });

    it("should handle email session", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");
      const { mailbox } = await mailboxFactory.create();
      const testEmail = "test@example.com";
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty("count");
      expect(typeof result.count).toBe("number");
    });
  });

  describe("parameter parsing", () => {
    let mailbox: any;
    const testEmail = "test@example.com";

    beforeEach(async () => {
      const result = await mailboxFactory.create();
      mailbox = result.mailbox;
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;
    });

    it("should parse status parameter as array", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread?status=open,closed");

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty("count");
      expect(typeof result.count).toBe("number");
    });

    it("should parse limit parameter", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread?limit=2");

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toHaveProperty("count");
      expect(typeof result.count).toBe("number");
    });

    it("should return 400 for invalid parameters", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread?limit=invalid");

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Invalid search parameters");
      expect(result.details).toBeDefined();
    });
  });

  describe("unread count logic", () => {
    let mailbox: any;
    const testEmail = "test@example.com";

    beforeEach(async () => {
      const result = await mailboxFactory.create();
      mailbox = result.mailbox;
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;
    });

    it("should return 0 when no conversations exist", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.count).toBe(0);
    });

    it("should return 0 when all conversations are read", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");

      const lastReadTime = new Date("2025-01-02T12:00:00.000Z");
      const { conversation } = await conversationFactory.create({
        emailFrom: testEmail,
        lastReadAt: lastReadTime,
      });

      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T11:00:00.000Z"),
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.count).toBe(0);
    });

    it("should count conversations with unread messages", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");

      const lastReadTime = new Date("2025-01-02T12:00:00.000Z");

      const { conversation: unreadConv1 } = await conversationFactory.create({
        emailFrom: testEmail,
        lastReadAt: lastReadTime,
      });

      const { conversation: unreadConv2 } = await conversationFactory.create({
        emailFrom: testEmail,
        lastReadAt: lastReadTime,
      });

      const { conversation: readConv } = await conversationFactory.create({
        emailFrom: testEmail,
        lastReadAt: lastReadTime,
      });

      await conversationMessagesFactory.create(unreadConv1.id, {
        role: "user",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T13:00:00.000Z"),
      });

      await conversationMessagesFactory.create(unreadConv2.id, {
        role: "ai_assistant",
        createdAt: new Date("2025-01-02T14:00:00.000Z"),
      });

      await conversationMessagesFactory.create(readConv.id, {
        role: "user",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T11:00:00.000Z"),
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.count).toBe(2);
    });

    it("should handle conversations with null lastReadAt", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");

      const { conversation } = await conversationFactory.create({
        emailFrom: testEmail,
        lastReadAt: null,
      });

      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T12:00:00.000Z"),
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.count).toBe(1);
    });

    it("should filter by session for anonymous users", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");
      const anonymousSessionId = "anon456";
      mockSession = { isAnonymous: true, anonymousSessionId };

      const lastReadTime = new Date("2025-01-02T12:00:00.000Z");

      const { conversation: myConv } = await conversationFactory.create({
        anonymousSessionId,
        lastReadAt: lastReadTime,
      });

      const { conversation: otherConv } = await conversationFactory.create({
        anonymousSessionId: "different-session",
        lastReadAt: lastReadTime,
      });

      await conversationMessagesFactory.create(myConv.id, {
        role: "user",
        createdAt: new Date("2025-01-02T13:00:00.000Z"),
      });

      await conversationMessagesFactory.create(otherConv.id, {
        role: "user",
        createdAt: new Date("2025-01-02T13:00:00.000Z"),
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.count).toBe(1);
    });

    it("should work with search parameters", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread?status=open");

      const lastReadTime = new Date("2025-01-02T12:00:00.000Z");

      const { conversation: openUnread } = await conversationFactory.create({
        emailFrom: testEmail,
        status: "open",
        lastReadAt: lastReadTime,
      });

      const { conversation: closedUnread } = await conversationFactory.create({
        emailFrom: testEmail,
        status: "closed",
        lastReadAt: lastReadTime,
      });

      await conversationMessagesFactory.create(openUnread.id, {
        role: "user",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T13:00:00.000Z"),
      });

      await conversationMessagesFactory.create(closedUnread.id, {
        role: "user",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T13:00:00.000Z"),
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.count).toBe(1);
    });
  });

  describe("response format", () => {
    let mailbox: any;
    const testEmail = "test@example.com";

    beforeEach(async () => {
      const result = await mailboxFactory.create();
      mailbox = result.mailbox;
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;
    });

    it("should return correct response structure", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result).toEqual({
        count: expect.any(Number),
      });
      expect(Object.keys(result)).toHaveLength(1);
    });

    it("should include CORS headers", async () => {
      const request = new Request("https://example.com/api/chat/conversations/unread");

      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.headers.get("Access-Control-Allow-Origin")).toBeDefined();
    });
  });
});

import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/chat/conversations/route";

let mockSession: any;
let mockMailbox: any;

vi.mock("@/app/api/widget/utils", async (importOriginal) => ({
  ...(await importOriginal()),
  withWidgetAuth: vi.fn((handler) => (request: Request, _context: any) => {
    return handler({ request }, { session: mockSession, mailbox: mockMailbox });
  }),
}));

describe("GET /api/chat/conversations", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("authentication", () => {
    it("should return 401 for invalid session without email or anonymousSessionId", async () => {
      const request = new Request("https://example.com/api/chat/conversations");
      const { mailbox } = await mailboxFactory.create();
      mockSession = { isAnonymous: false };
      mockMailbox = mailbox;

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe("Not authorized - Invalid session");
    });

    it("should handle anonymous session with anonymousSessionId", async () => {
      const request = new Request("https://example.com/api/chat/conversations");
      const { mailbox } = await mailboxFactory.create();
      const anonymousSessionId = "anon123";
      mockSession = { isAnonymous: true, anonymousSessionId };
      mockMailbox = mailbox;

      const { conversation } = await conversationFactory.create({
        anonymousSessionId,
      });

      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].slug).toBe(conversation.slug);
    });

    it("should handle email session", async () => {
      const request = new Request("https://example.com/api/chat/conversations");
      const { mailbox } = await mailboxFactory.create();
      const testEmail = "test@example.com";
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;

      const { conversation } = await conversationFactory.create({
        emailFrom: testEmail,
      });

      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].slug).toBe(conversation.slug);
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
      const request = new Request("https://example.com/api/chat/conversations?status=open,closed");

      const { conversation: openConv } = await conversationFactory.create({
        status: "open",
        emailFrom: testEmail,
      });
      const { conversation: closedConv } = await conversationFactory.create({
        status: "closed",
        emailFrom: testEmail,
      });
      const { conversation: spamConv } = await conversationFactory.create({
        status: "spam",
        emailFrom: testEmail,
      });

      await conversationMessagesFactory.create(openConv.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(closedConv.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(spamConv.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(2);
      const slugs = result.conversations.map((c: any) => c.slug);
      expect(slugs).toContain(openConv.slug);
      expect(slugs).toContain(closedConv.slug);
    });

    it("should parse limit parameter", async () => {
      const request = new Request("https://example.com/api/chat/conversations?limit=2");

      const { conversation: conv1 } = await conversationFactory.create({ emailFrom: testEmail });
      const { conversation: conv2 } = await conversationFactory.create({ emailFrom: testEmail });
      const { conversation: conv3 } = await conversationFactory.create({ emailFrom: testEmail });

      await conversationMessagesFactory.create(conv1.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(conv2.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(conv3.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(2);
    });

    it("should return 400 for invalid parameters", async () => {
      const request = new Request("https://example.com/api/chat/conversations?limit=invalid");

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Invalid search parameters");
      expect(result.details).toBeDefined();
    });
  });

  describe("search functionality", () => {
    let mailbox: any;
    const testEmail = "test@example.com";

    beforeEach(async () => {
      const result = await mailboxFactory.create();
      mailbox = result.mailbox;
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;
    });

    it("should return formatted conversations", async () => {
      const request = new Request("https://example.com/api/chat/conversations");

      const subject1 = "Test Subject 1";
      const subject2 = null;
      const { conversation: conv1 } = await conversationFactory.create({
        subject: subject1,
        emailFrom: testEmail,
      });
      const { conversation: conv2 } = await conversationFactory.create({
        subject: subject2,
        emailFrom: testEmail,
      });

      await conversationMessagesFactory.create(conv1.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(conv2.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(2);

      const conv1Result = result.conversations.find((c: any) => c.slug === conv1.slug);
      const conv2Result = result.conversations.find((c: any) => c.slug === conv2.slug);

      expect(conv1Result.subject).toBe(subject1);
      expect(conv2Result.subject).toBe("(no subject)");
      expect(conv1Result.slug).toBe(conv1.slug);
      expect(conv2Result.slug).toBe(conv2.slug);
      expect(conv1Result.createdAt).toBeDefined();
      expect(conv1Result.messageCount).toBe(1);
    });

    it("should handle search with multiple parameters", async () => {
      const request = new Request(
        "https://example.com/api/chat/conversations?createdAfter=2025-01-01T00:00:00.000Z&status=open&limit=5",
      );

      const { conversation: matchingConv } = await conversationFactory.create({
        subject: "This is a test conversation",
        status: "open",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      });
      const { conversation: dateConv } = await conversationFactory.create({
        subject: "This does not match",
        status: "open",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
      });
      const { conversation: statusConv } = await conversationFactory.create({
        subject: "Another test but closed",
        status: "closed",
        emailFrom: testEmail,
        createdAt: new Date("2025-01-02T00:00:00.000Z"),
      });

      await conversationMessagesFactory.create(matchingConv.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(dateConv.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(statusConv.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].slug).toBe(matchingConv.slug);
    });

    it("should combine session filter with search parameters", async () => {
      const request = new Request("https://example.com/api/chat/conversations?status=closed");
      const anonymousSessionId = "anon456";
      mockSession = { isAnonymous: true, anonymousSessionId };

      const { conversation: matchingConv } = await conversationFactory.create({
        subject: "I need help with my account",
        status: "closed",
        anonymousSessionId,
      });
      const { conversation: openConv } = await conversationFactory.create({
        subject: "Help me please",
        status: "open",
        anonymousSessionId,
      });
      const { conversation: differentSessionConv } = await conversationFactory.create({
        subject: "I need help",
        status: "closed",
        anonymousSessionId: "different-session",
      });

      await conversationMessagesFactory.create(matchingConv.id, {
        role: "user",
      });
      await conversationMessagesFactory.create(openConv.id, {
        role: "user",
      });
      await conversationMessagesFactory.create(differentSessionConv.id, {
        role: "user",
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].slug).toBe(matchingConv.slug);
    });

    it("should not return conversations without messages", async () => {
      const request = new Request("https://example.com/api/chat/conversations");

      const { conversation: convWithMessage } = await conversationFactory.create({
        subject: "Conversation with message",
        emailFrom: testEmail,
      });
      const { conversation: _convWithoutMessage } = await conversationFactory.create({
        subject: "Conversation without message",
        emailFrom: testEmail,
      });

      await conversationMessagesFactory.create(convWithMessage.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].slug).toBe(convWithMessage.slug);
    });
  });

  describe("pagination", () => {
    let mailbox: any;
    const testEmail = "test@example.com";

    beforeEach(async () => {
      const result = await mailboxFactory.create();
      mailbox = result.mailbox;
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;
    });

    it("should use default page size of 20", async () => {
      const request = new Request("https://example.com/api/chat/conversations");

      const { conversation: conv1 } = await conversationFactory.create({ emailFrom: testEmail });
      const { conversation: conv2 } = await conversationFactory.create({ emailFrom: testEmail });

      await conversationMessagesFactory.create(conv1.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(conv2.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(2);
    });

    it("should handle cursor parameter", async () => {
      const request = new Request("https://example.com/api/chat/conversations?cursor=cursor-123");

      const { conversation } = await conversationFactory.create({ emailFrom: testEmail });

      await conversationMessagesFactory.create(conversation.id, {
        role: "user",
        emailFrom: testEmail,
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe("message count", () => {
    let mailbox: any;
    const testEmail = "test@example.com";

    beforeEach(async () => {
      const result = await mailboxFactory.create();
      mailbox = result.mailbox;
      mockSession = { isAnonymous: false, email: testEmail };
      mockMailbox = mailbox;
    });

    it("should return correct message count", async () => {
      const request = new Request("https://example.com/api/chat/conversations");

      const { conversation: conv1 } = await conversationFactory.create({
        emailFrom: testEmail,
        subject: "First conversation",
      });

      const { conversation: conv2 } = await conversationFactory.create({
        emailFrom: testEmail,
        subject: "Second conversation",
      });

      await conversationMessagesFactory.create(conv1.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(conv1.id, {
        role: "ai_assistant",
      });
      await conversationMessagesFactory.create(conv1.id, {
        role: "staff",
      });

      await conversationMessagesFactory.create(conv2.id, {
        role: "user",
        emailFrom: testEmail,
      });
      await conversationMessagesFactory.create(conv2.id, {
        role: "ai_assistant",
      });

      const response = await GET(request, { params: Promise.resolve({}) });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.conversations).toHaveLength(2);

      const conv1Result = result.conversations.find((c: any) => c.slug === conv1.slug);
      const conv2Result = result.conversations.find((c: any) => c.slug === conv2.slug);

      expect(conv1Result.messageCount).toBe(3);
      expect(conv2Result.messageCount).toBe(2);
    });
  });
});

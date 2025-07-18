import { conversationFactory } from "@tests/support/factories/conversations";
import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PATCH } from "@/app/api/chat/conversation/[slug]/route";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";

let mockSession: any;
let mockMailbox: any;

vi.mock("@/app/api/widget/utils", () => ({
  withWidgetAuth: vi.fn((handler) => (request: Request, context: any) => {
    return handler({ request, context }, { session: mockSession, mailbox: mockMailbox });
  }),
}));

describe("PATCH /api/chat/conversation/[slug]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should update lastReadAt when markRead is true", async () => {
    const { mailbox } = await mailboxFactory.create();
    const testEmail = "test@example.com";
    const { conversation } = await conversationFactory.create({
      emailFrom: testEmail,
      lastReadAt: null,
    });

    mockSession = { isAnonymous: false, email: testEmail };
    mockMailbox = mailbox;

    const beforeUpdate = new Date();

    const request = new Request("https://example.com/api/chat/conversation/test-slug", {
      method: "PATCH",
      body: JSON.stringify({ markRead: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });

    expect(updatedConversation?.lastReadAt).toBeDefined();
    expect(updatedConversation?.lastReadAt).toBeInstanceOf(Date);
    expect(updatedConversation?.lastReadAt?.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it("should work with anonymous session", async () => {
    const { mailbox } = await mailboxFactory.create();
    const anonymousSessionId = "anon123";
    const { conversation } = await conversationFactory.create({
      anonymousSessionId,
      lastReadAt: null,
    });

    mockSession = { isAnonymous: true, anonymousSessionId };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api/chat/conversation/test-slug", {
      method: "PATCH",
      body: JSON.stringify({ markRead: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);

    const updatedConversation = await db.query.conversations.findFirst({
      where: eq(conversations.id, conversation.id),
    });

    expect(updatedConversation?.lastReadAt).toBeDefined();
  });

  it("should return 400 when markRead parameter is missing", async () => {
    const { mailbox } = await mailboxFactory.create();
    const testEmail = "test@example.com";
    const { conversation } = await conversationFactory.create({
      emailFrom: testEmail,
    });

    mockSession = { isAnonymous: false, email: testEmail };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api/chat/conversation/test-slug", {
      method: "PATCH",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(400);
    expect(result.error).toBe("markRead parameter is required");
  });

  it("should return 404 when conversation is not found", async () => {
    const { mailbox } = await mailboxFactory.create();
    const testEmail = "test@example.com";

    mockSession = { isAnonymous: false, email: testEmail };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api/chat/conversation/non-existent-slug", {
      method: "PATCH",
      body: JSON.stringify({ markRead: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ slug: "non-existent-slug" }),
    });
    const result = await response.json();

    expect(response.status).toBe(404);
    expect(result.error).toBe("Conversation not found");
  });

  it("should return 401 for invalid session", async () => {
    const { mailbox } = await mailboxFactory.create();
    const { conversation } = await conversationFactory.create();

    mockSession = { isAnonymous: false };
    mockMailbox = mailbox;

    const request = new Request("https://example.com/api/chat/conversation/test-slug", {
      method: "PATCH",
      body: JSON.stringify({ markRead: true }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ slug: conversation.slug }),
    });
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe("Not authorized - Invalid session");
  });
});

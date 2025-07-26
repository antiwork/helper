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

  it("should return 401 for invalid session", async () => {
    const request = new Request("https://example.com/api/chat/conversations/unread");
    const { mailbox } = await mailboxFactory.create();
    mockSession = { isAnonymous: false };
    mockMailbox = mailbox;

    const response = await GET(request, { params: Promise.resolve({}) });
    const result = await response.json();

    expect(response.status).toBe(401);
    expect(result.error).toBe("Not authorized - Invalid session");
  });

  it("should return unread count for valid sessions", async () => {
    const request = new Request("https://example.com/api/chat/conversations/unread");
    const { mailbox } = await mailboxFactory.create();
    mockSession = { isAnonymous: true, anonymousSessionId: "anon123" };
    mockMailbox = mailbox;

    const response = await GET(request, { params: Promise.resolve({}) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.count).toBe(0);
  });

  it("should count unread conversations correctly", async () => {
    const { mailbox } = await mailboxFactory.create();
    const anonymousSessionId = "anon123";
    mockSession = { isAnonymous: true, anonymousSessionId };
    mockMailbox = mailbox;

    const { conversation } = await conversationFactory.create({
      unused_mailboxId: mailbox.id,
      anonymousSessionId,
      lastReadAt: null,
    });

    await conversationMessagesFactory.create(conversation.id, {
      createdAt: new Date(),
      role: "user",
      body: "Test message",
    });

    const request = new Request("https://example.com/api/chat/conversations/unread");
    const response = await GET(request, { params: Promise.resolve({}) });
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.count).toBe(1);
  });
});

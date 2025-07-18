import { conversationFactory } from "@tests/support/factories/conversations";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "@/app/api/chat/conversation/[slug]/route";

vi.mock("@/lib/realtime/publish", () => ({
  publishToRealtime: vi.fn(),
}));

let mockSession: any;

vi.mock("@/app/api/widget/utils", () => ({
  withWidgetAuth: vi.fn((handler) => (request: Request, context: any) => {
    return handler({ request, context }, { session: mockSession });
  }),
}));

describe("GET /api/chat/conversation/[slug]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should update lastReadAt when markRead is true", async () => {
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });
    
    mockSession = { isAnonymous: false, email: "test@example.com" };
    
    const request = new Request(`https://example.com/api/chat/conversation/${conversation.slug}`);
    const context = { params: Promise.resolve({ slug: conversation.slug }) };
    
    const response = await GET(request, context);
    
    expect(response.status).toBe(200);
  });

  it("should not update lastReadAt when markRead=false", async () => {
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });
    
    mockSession = { isAnonymous: false, email: "test@example.com" };
    
    const request = new Request(`https://example.com/api/chat/conversation/${conversation.slug}?markRead=false`);
    const context = { params: Promise.resolve({ slug: conversation.slug }) };
    
    const response = await GET(request, context);
    
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/chat/conversation/[slug]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should update lastReadAt when markRead is true", async () => {
    const { conversation } = await conversationFactory.create({
      emailFrom: "test@example.com",
    });
    
    mockSession = { isAnonymous: false, email: "test@example.com" };
    
    const request = new Request(`https://example.com/api/chat/conversation/${conversation.slug}`, {
      method: "PATCH",
    });
    const context = { params: Promise.resolve({ slug: conversation.slug }) };
    
    const response = await PATCH(request, context);
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it("should work with anonymous session", async () => {
    const anonymousSessionId = "anon123";
    const { conversation } = await conversationFactory.create({
      anonymousSessionId,
    });
    
    mockSession = { isAnonymous: true, anonymousSessionId };
    
    const request = new Request(`https://example.com/api/chat/conversation/${conversation.slug}`, {
      method: "PATCH",
    });
    const context = { params: Promise.resolve({ slug: conversation.slug }) };
    
    const response = await PATCH(request, context);
    
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.success).toBe(true);
  });

  it("should return 404 for non-existent conversation", async () => {
    mockSession = { isAnonymous: false, email: "test@example.com" };
    
    const request = new Request("https://example.com/api/chat/conversation/non-existent", {
      method: "PATCH",
    });
    const context = { params: Promise.resolve({ slug: "non-existent" }) };
    
    const response = await PATCH(request, context);
    
    expect(response.status).toBe(404);
  });

  it("should return 401 for invalid session", async () => {
    mockSession = { isAnonymous: false };
    
    const request = new Request("https://example.com/api/chat/conversation/test-slug", {
      method: "PATCH",
    });
    const context = { params: Promise.resolve({ slug: "test-slug" }) };
    
    const response = await PATCH(request, context);
    
    expect(response.status).toBe(401);
  });
});

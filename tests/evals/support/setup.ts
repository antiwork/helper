import { afterAll, beforeAll, beforeEach, vi } from "vitest";

beforeAll(() => {
  // Allow testing server-only modules
  vi.mock("server-only", () => {
    return {};
  });

  vi.mock("@/lib/data/retrieval", () => {
    return {
      fetchPromptRetrievalData: vi.fn(),
      findSimilarConversations: vi.fn(),
      getPastConversationsPrompt: vi.fn(),
    };
  });

  vi.mock("@/lib/ai/tools", () => {
    return {
      buildTools: vi.fn(),
    };
  });
});

beforeEach(() => {
  vi.resetAllMocks();
});

afterAll(() => {
  vi.resetAllMocks();
});

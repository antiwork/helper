import { envMock } from "@tests/support/mockEnv";
import { truncateDb } from "@tests/support/setupDatabase";
import { afterAll, beforeAll, beforeEach, vi } from "vitest";

beforeAll(() => {
  vi.mock("@/env", () => ({ env: envMock() }));

  // Used implicitly by the Vercel AI SDK
  vi.stubEnv("OPENAI_API_KEY", "test-openai-api-key");

  // Allow testing server-only modules
  vi.mock("server-only", () => {
    return {};
  });

  vi.mock("react", async (importOriginal) => {
    const testCache = <T extends (...args: unknown[]) => unknown>(func: T) => func;
    const originalModule = await importOriginal<typeof import("react")>();
    return {
      ...originalModule,
      cache: testCache,
    };
  });
});

afterAll(() => {
  vi.resetAllMocks();
});

beforeEach(async () => await truncateDb());

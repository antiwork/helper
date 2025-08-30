import "@testing-library/jest-dom/vitest";
import { truncateDb } from "@tests/support/setupDatabase";
import { afterAll, beforeAll, beforeEach, inject, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("POSTGRES_URL", inject("TEST_DATABASE_URL"));

  vi.mock("@/lib/env", () => ({
    isAIMockingEnabled: false,
    env: {
      POSTGRES_URL: inject("TEST_DATABASE_URL"),
      CRYPTO_SECRET: "secret",
      AUTH_URL: "http://localhost:1234",
      SLACK_CLIENT_ID: "client-id",
      NODE_ENV: "test",
      GOOGLE_PUBSUB_CLAIM_EMAIL: "service-push-authentication@helper-ai-413611.iam.gserviceaccount.com",
      OPENAI_API_KEY: "test-openai-api-key",
      ADDITIONAL_PAID_ORGANIZATION_IDS: "org_1234567890",
    },
  }));

  // Used implicitly by the Vercel AI SDK
  vi.stubEnv("OPENAI_API_KEY", "test-openai-api-key");

  // Supabase environment variables
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

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

beforeEach(async () => {
  await truncateDb();
});

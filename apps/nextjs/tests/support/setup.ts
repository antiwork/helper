import { truncateDb } from "@tests/support/setupDatabase";
import { afterAll, beforeAll, beforeEach, inject, vi } from "vitest";

beforeAll(() => {
  vi.mock("@/env", () => {
    const TEST_DATABASE_URL = inject("TEST_DATABASE_URL");
    const stubbedEnv = {
      POSTGRES_URL: TEST_DATABASE_URL,
      CRYPTO_SECRET: "secret",
      ENCRYPT_COLUMN_SECRET: "2319a2b757d52982035248289cb0fe27",
      AUTH_URL: "http://localhost:1234",
      AUTH_SECRET: "secret",
      SLACK_CLIENT_ID: "client-id",
      NODE_ENV: "test",
      GOOGLE_PUBSUB_CLAIM_EMAIL: "service-push-authentication@helper-ai-413611.iam.gserviceaccount.com",
      STRIPE_WEBHOOK_SECRET: "stripe_webhook_secret",
      OPENAI_API_KEY: "test-openai-api-key",
      ABLY_API_KEY: "test-ably-api-key",
      ADDITIONAL_PAID_ORGANIZATION_IDS: "org_1234567890",
    };
    return {
      env: stubbedEnv,
    };
  });

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

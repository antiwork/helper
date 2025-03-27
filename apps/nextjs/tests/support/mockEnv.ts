import { inject } from "vitest";

export const envMock = () => ({
  POSTGRES_URL: inject("TEST_DATABASE_URL"),
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
});

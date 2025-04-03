import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets";
import { z } from "zod";

const defaultUnlessDeployed = (value: z.ZodString, testingDefault: string) =>
  ["preview", "production"].includes(process.env.VERCEL_ENV ?? "") ? value : value.default(testingDefault);

export const env = createEnv({
  extends: [vercel()],
  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    AUTH_URL: defaultUnlessDeployed(z.string().url(), "https://helperai.dev"), // The root URL of the app; legacy name which was required by next-auth
    POSTGRES_URL: defaultUnlessDeployed(
      z.string().url(),
      "postgresql://username:password@127.0.0.1:5435/helperai_development",
    ),
    POSTGRES_URL_NON_POOLING: defaultUnlessDeployed(
      z.string().url(),
      // Same as POSTGRES_URL unless using a cloud database provider with built-in pooling
      "postgresql://username:password@127.0.0.1:5435/helperai_development",
    ),
    KV_UPSTASH_KV_REST_API_URL: defaultUnlessDeployed(z.string().url(), "http://localhost:8089"),
    KV_UPSTASH_KV_REST_API_TOKEN: defaultUnlessDeployed(z.string().min(1), "example_token"),
    NEXT_RUNTIME: z.enum(["nodejs", "edge"]).default("nodejs"),

    CRYPTO_SECRET: defaultUnlessDeployed(z.string().min(1), "example_crypto_secret"),
    ENCRYPT_COLUMN_SECRET: defaultUnlessDeployed(
      z.string().regex(/^[a-f0-9]{32}$/, "must be a random 32-character hex string"),
      "1234567890abcdef1234567890abcdef",
    ),
    WIDGET_JWT_SECRET: defaultUnlessDeployed(z.string().min(1), "example_jwt_secret"),

    // Required integrations
    OPENAI_API_KEY: z.string().min(1), // API key from https://platform.openai.com for AI models
    ABLY_API_KEY: z.string().min(1), // API key from https://ably.com for real-time events
    GOOGLE_CLIENT_ID: z.string().min(1), // Google OAuth client credentials from https://console.cloud.google.com for Gmail sync
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    GOOGLE_PUBSUB_TOPIC_NAME: z.string().min(1), // Google PubSub for Gmail sync
    GOOGLE_PUBSUB_CLAIM_EMAIL: z.string().email().min(1),
    RESEND_API_KEY: z.string().min(1), // API key from https://resend.com for transactional emails
    AWS_ACCESS_KEY_ID: z.string().min(1), // S3 credentials for file storage
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_DEFAULT_REGION: z.string().min(1),
    AWS_PRIVATE_STORAGE_BUCKET_NAME: z.string().min(1),
    CLERK_SECRET_KEY: z.string().min(1), // Secret key from https://dashboard.clerk.com
    CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: z.string().min(1).default("/mailboxes"),
    CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: z.string().min(1).default("/mailboxes"),

    // For running database seeds, Set these up on https://dashboard.clerk.com
    CLERK_INITIAL_ORGANIZATION_ID: z
      .string()
      .regex(/^org_\w+$/)
      .optional(),
    CLERK_INITIAL_USER_IDS: z
      .string()
      .regex(/^user_\w+(?:,user_\w+)*$/)
      .optional(),

    // Optional integrations

    // Slack OAuth client credentials from https://api.slack.com/apps
    SLACK_CLIENT_ID: z.string().min(1).optional(),
    SLACK_CLIENT_SECRET: z.string().min(1).optional(),
    SLACK_SIGNING_SECRET: z.string().min(1).optional(),
    // GitHub app credentials from https://github.com/apps
    GITHUB_APP_SLUG: z.string().min(1).optional(),
    GITHUB_APP_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_PRIVATE_KEY: z.string().min(1).optional(),
    // Stripe subscription plan and credentials for paid organizations
    STRIPE_PRICE_ID: z.string().min(1).optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
    STRIPE_SECRET_KEY: z.string().min(1).optional(),
    // Lets you consider your own org as having a paid subscription. If using Stripe in development you probably want this the same as CLERK_INITIAL_ORGANIZATION_ID
    ADDITIONAL_PAID_ORGANIZATION_IDS: z
      .string()
      .regex(/^org_\w+(?:,org_\w+)*$/)
      .optional(),
    // Token from https://jina.ai for the widget to read the current page
    JINA_API_TOKEN: z.string().min(1).optional(),
    // API key from https://www.firecrawl.dev to import help docs from a website
    FIRECRAWL_API_KEY: z.string().min(1).optional(),
    // Proxy assets when rendering email content
    PROXY_URL: z.string().url().optional(),
    PROXY_SECRET_KEY: z.string().min(1).optional(),
    // Sign in with Apple credentials for integration with the desktop app
    APPLE_APP_ID: z.string().min(1).optional(),
    APPLE_TEAM_ID: z.string().min(1).optional(),
    APPLE_PRIVATE_KEY: z.string().min(1).optional(),
    APPLE_PRIVATE_KEY_IDENTIFIER: z.string().min(1).optional(),

    DRIZZLE_LOGGING: z.string().optional(), // Log SQL queries to the console
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().min(1).default("/login"),
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().min(1).default("/login"),
    NEXT_PUBLIC_VERCEL_ENV: defaultUnlessDeployed(
      z.enum(["development", "preview", "production"]) as any,
      "development",
    ),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
  },
  skipValidation: process.env.npm_lifecycle_event === "lint" || process.env.NODE_ENV === "test",
});

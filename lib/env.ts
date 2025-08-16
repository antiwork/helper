import { createEnv } from "@t3-oss/env-nextjs";
import { vercel } from "@t3-oss/env-nextjs/presets";
import { z } from "zod";

const defaultUnlessDeployed = <V extends z.ZodString | z.ZodOptional<z.ZodString>>(value: V, testingDefault: string) =>
  ["preview", "production"].includes(process.env.VERCEL_ENV ?? "") ? value : value.default(testingDefault);

const defaultRootUrl =
  process.env.VERCEL_ENV === "production"
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : `https://${process.env.VERCEL_URL ?? "helperai.dev"}`;

// `next dev` forces NODE_ENV to "development" so we need to use a different environment variable
export const isAIMockingEnabled = process.env.IS_TEST_ENV === "1";

export const env = createEnv({
  extends: [vercel()],
  shared: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    CI: z
      .enum(["true", "false", "1", "0"])
      .default("false")
      .transform((v) => v === "true" || v === "1"),
    DISABLE_STRICT_MODE: z
      .enum(["true", "false"])
      .default("false")
      .transform((v) => v === "true"),
  },
  /**
   * Specify your server-side environment variables schema here.
   * This way you can ensure the app isn't built with invalid env vars.
   */
  server: {
    // Set this for both local development and when deploying
    OPENAI_API_KEY: isAIMockingEnabled ? z.string().min(1).default("mock-openai-api-key") : z.string().min(1), // API key from https://platform.openai.com for AI models

    // Set these before or after deploying for email sending and receiving
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM_ADDRESS: z.string().min(1).optional(),
    GOOGLE_CLIENT_ID: z.string().min(1).optional(), // Google OAuth client credentials from https://console.cloud.google.com for Gmail sync
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
    GOOGLE_PUBSUB_TOPIC_NAME: z.string().min(1).optional(), // Google PubSub for Gmail sync
    GOOGLE_PUBSUB_CLAIM_EMAIL: z.string().email().min(1).optional(),

    // Set these when deploying if you're not using Vercel with the Supabase integration
    AUTH_URL: z.string().url().default(defaultRootUrl), // The root URL of the app; legacy name which was required by next-auth
    POSTGRES_URL: defaultUnlessDeployed(
      z.string().url(),
      `postgresql://postgres:postgres@127.0.0.1:${process.env.LOCAL_SUPABASE_DB_PORT}/postgres`,
    ),
    POSTGRES_URL_NON_POOLING: defaultUnlessDeployed(
      z.string().url(),
      // Same as POSTGRES_URL unless using Supabase with built-in pooling
      `postgresql://postgres:postgres@127.0.0.1:${process.env.LOCAL_SUPABASE_DB_PORT}/postgres`,
    ),
    DATABASE_URL: z.string().url().optional(),
    // Based on Supabase's default local development secret ("super-secret-jwt-token-with-at-least-32-characters-long")
    SUPABASE_SERVICE_ROLE_KEY: defaultUnlessDeployed(
      z.string().min(1),
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
    ),
    NEXT_RUNTIME: z.enum(["nodejs", "edge"]).default("nodejs"),

    // Other optional integrations

    // Slack OAuth client credentials from https://api.slack.com/apps
    SLACK_CLIENT_ID: z.string().min(1).optional(),
    SLACK_CLIENT_SECRET: z.string().min(1).optional(),
    SLACK_SIGNING_SECRET: z.string().min(1).optional(),
    // GitHub app credentials from https://github.com/apps
    GITHUB_APP_SLUG: z.string().min(1).optional(),
    GITHUB_APP_ID: z.string().min(1).optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(),
    GITHUB_PRIVATE_KEY: z.string().min(1).optional(),
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

    // Optional configuration

    // Allow automatic signups from specific domains (e.g. your company's email domain)
    EMAIL_SIGNUP_DOMAINS: z
      .string()
      .default("")
      .transform((v) => (v ? v.split(",").map((d) => d.trim()) : [])),

    // Log SQL queries to the console
    DRIZZLE_LOGGING: z.string().optional(),

    // For running database seeds
    INITIAL_USER_EMAILS: z
      .string()
      .default("support@gumroad.com")
      .transform((v) => v.split(",")),
  },

  /**
   * Specify your client-side environment variables schema here.
   * For them to be exposed to the client, prefix them with `NEXT_PUBLIC_`.
   */
  client: {
    NEXT_PUBLIC_SUPABASE_URL: defaultUnlessDeployed(z.string().url().min(1), "https://supabase.helperai.dev"),
    // Based on Supabase's default local development secret ("super-secret-jwt-token-with-at-least-32-characters-long")
    NEXT_PUBLIC_SUPABASE_ANON_KEY: defaultUnlessDeployed(
      z.string().min(1),
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0",
    ),

    NEXT_PUBLIC_SENTRY_DSN: z.string().optional(), // Sentry DSN for error tracking

    // Helper host URL configuration - overrides automatic detection in e2e tests
    NEXT_PUBLIC_DEV_HOST: z.string().url().optional().default("https://helperai.dev"),
  },
  /**
   * Destructure all variables from `process.env` to make sure they aren't tree-shaken away.
   */
  experimental__runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    CI: process.env.CI,
    DISABLE_STRICT_MODE: process.env.DISABLE_STRICT_MODE,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEV_HOST: process.env.NEXT_PUBLIC_DEV_HOST,
  },
  skipValidation: process.env.npm_lifecycle_event === "lint" || process.env.NODE_ENV === "test",
});

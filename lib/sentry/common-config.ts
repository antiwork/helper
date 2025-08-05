import { env } from "@/lib/env";

export const commonConfig = {
  dsn: env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: env.NODE_ENV === "production",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.02,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
};

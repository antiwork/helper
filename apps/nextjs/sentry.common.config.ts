import { env } from "@/env";

export const commonConfig = {
  dsn: "https://84640ca2ac12acbfd7a06e0a02e3ba56@o4508048702767104.ingest.us.sentry.io/4508049493196800",
  enabled: env.NODE_ENV === "production",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
};

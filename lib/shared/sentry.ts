import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";

export const captureExceptionAndThrowIfDevelopment = (
  error: Parameters<typeof Sentry.captureException>[0],
  hint?: Parameters<typeof Sentry.captureException>[1],
) => {
  Sentry.captureException(error, hint);
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") throw error;
  // eslint-disable-next-line no-console
  else console.error(error, hint);
};

export const captureExceptionAndLog = (
  error: Parameters<typeof Sentry.captureException>[0],
  hint?: Parameters<typeof Sentry.captureException>[1],
) => {
  // eslint-disable-next-line no-console
  console.error(error, hint);
  Sentry.captureException(error, hint);
};

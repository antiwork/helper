import * as Sentry from "@sentry/nextjs";
import { env } from "@/env";

export const captureExceptionAndThrowIfDevelopment = (
  error: Parameters<typeof Sentry.captureException>[0],
  hint?: Parameters<typeof Sentry.captureException>[1],
) => {
  Sentry.captureException(error, hint);
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") throw error;
};

export const captureExceptionAndLogIfDevelopment = (
  error: Parameters<typeof Sentry.captureException>[0],
  hint?: Parameters<typeof Sentry.captureException>[1],
) => {
  Sentry.captureException(error, hint);
  if (env.NODE_ENV === "development" || env.NODE_ENV === "test") console.error(error);
};

export const captureExceptionAndLog = (
  error: Parameters<typeof Sentry.captureException>[0],
  hint?: Parameters<typeof Sentry.captureException>[1],
) => {
  Sentry.captureException(error, hint);
  console.error(error);
};

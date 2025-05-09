// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { commonConfig } from "@/lib/sentry/common-config";

Sentry.init({
  ...commonConfig,

  // Add optional integrations for additional features
  // integrations: [Sentry.replayIntegration()],

  // Define how likely Replay events are sampled.
  // Can be set to non-zero values to capture replays of random sessions even if they don't have errors.
  // replaysSessionSampleRate: 0,

  // Define how likely Replay events are sampled when an error occurs.
  // replaysOnErrorSampleRate: 1.0,
});

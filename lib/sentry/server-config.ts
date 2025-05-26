// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { commonConfig } from "./common-config";

Sentry.init({
  ...commonConfig,
  beforeSend: (event) => {
    const exception = event.exception?.values?.[0];
    if (exception?.type === "TRPCError" && exception.value?.includes("NOT_FOUND")) return null;
    return event;
  },
});

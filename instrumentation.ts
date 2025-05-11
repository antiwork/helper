import * as Sentry from "@sentry/nextjs";
import { registerOTel } from "@vercel/otel";
import { env } from "@/lib/env";

export async function register() {
  if (env.NEXT_RUNTIME === "nodejs") {
    await import("@/lib/sentry/server-config");
  }

  if (env.NEXT_RUNTIME === "edge") {
    await import("@/lib/sentry/edge-config");
  }

  registerOTel({
    serviceName: "helper",
  });
}

export const onRequestError = Sentry.captureRequestError;

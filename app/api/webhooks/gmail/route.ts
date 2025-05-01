import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { inngest } from "@/inngest/client";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

// https://app.inngest.com/env/production/manage/webhooks/20cb171c-b095-4df3-8e50-30e4989e9f48
// This doesn't transform anything - it forwards the request body + headers to Inngest so that
// we don't pay the cost of publishing an Inngest event ourselves for each Gmail webhook request.
// Be sure to remove the Typescript annotations when copy/pasting into Inngest.
function transform(evt: Record<string, any>, headers = {}, queryParams = {}) {
  const body = evt;

  return {
    id: body.message.messageId,
    name: "gmail/webhook.received" as const,
    data: {
      body,
      headers,
    },
  };
}

// Paste this into Inngest to test the transform function:
// {
//   "message": {
//     "data": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3Mjg3NDc1MDgsImV4cCI6MTc2MDI4MzUwOCwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSIsIkdpdmVuTmFtZSI6IkpvaG5ueSJ9.Qa0aE6VIILen8e74Xd6HaDRwdB4gDT0ruIYb6s3Smrc",
//     "messageId": "12345665100939385",
//     "publishTime": "2024-10-12T15:21:22.81Z"
//   },
//   "subscription": "projects/helper-ai-413611/subscriptions/mail-forwarding-sub"
// }

// This route exists purely for local development testing.
export async function POST(req: NextRequest) {
  if (env.NODE_ENV === "production") return new NextResponse(null, { status: 404 });

  try {
    // Avoid modifying this logic directly - it is meant to closely mirror how Inngest processes the Gmail
    // webhook events. When making modifications to the transform function, make sure to update the
    // transform function in the Inngest dashboard (in a way that's backwards compatible with the existing
    // Inngest functions in production that are listening to the Gmail webhook event).
    await inngest.send(
      transform(
        await req.json(),
        Object.fromEntries(req.headers.entries()),
        Object.fromEntries(new URL(req.url).searchParams.entries()),
      ),
    );

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    captureExceptionAndLog(e);
    return new NextResponse(null, { status: 500 });
  }
}

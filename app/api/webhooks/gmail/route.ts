import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    await inngest.send({
      id: body.message.messageId,
      name: "gmail/webhook.received",
      data: {
        body,
        headers: Object.fromEntries(req.headers.entries()),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    captureExceptionAndLog(e);
    return new NextResponse(null, { status: 500 });
  }
}

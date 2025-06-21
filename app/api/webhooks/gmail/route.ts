import { NextRequest, NextResponse } from "next/server";
import { triggerEvent } from "@/jobs/trigger";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    await triggerEvent("gmail/webhook.received", {
      body: json,
      headers: Object.fromEntries(req.headers.entries()),
    });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    captureExceptionAndLog(e);
    return new NextResponse(null, { status: 500 });
  }
}

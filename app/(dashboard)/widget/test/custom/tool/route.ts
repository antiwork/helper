import { NextRequest, NextResponse } from "next/server";
import { verifyHmac } from "@helperai/client/auth";
import { assertDefined } from "@/components/utils/assert";
import { getMailbox } from "@/lib/data/mailbox";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  if (env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const mailbox = assertDefined(await getMailbox());

  verifyHmac(body, request.headers.get("authorization"), mailbox.widgetHMACSecret);

  return NextResponse.json({
    success: true,
    message: `The current time is ${new Date().toISOString()}`,
  });
}

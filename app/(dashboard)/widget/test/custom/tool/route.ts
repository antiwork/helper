import { NextRequest, NextResponse } from "next/server";
import { verifyHmac } from "@helperai/client/auth";
import { assertDefined } from "@/components/utils/assert";
import { getMailbox } from "@/lib/data/mailbox";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const mailbox = assertDefined(await getMailbox());

  verifyHmac(body, request.headers.get("authorization"), mailbox.widgetHMACSecret);

  return NextResponse.json({
    success: true,
    message: `The current time is ${new Date().toISOString()}`,
  });
}

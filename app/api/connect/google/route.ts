import { NextResponse } from "next/server";
import { connectSupportEmailUrl } from "@/app/api/connect/google/utils";

export function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const mailbox = searchParams.get("mailbox")!;
  return NextResponse.redirect(connectSupportEmailUrl(mailbox));
}

import { NextResponse } from "next/server";
import { connectSupportEmailUrl } from "@/app/api/connect/google/utils";

export function GET() {
  return NextResponse.redirect(connectSupportEmailUrl());
}

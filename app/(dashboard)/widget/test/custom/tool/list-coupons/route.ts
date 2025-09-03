import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(_request: NextRequest) {
  if (env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  return NextResponse.json({
    success: true,
    data: {
      coupons: [
        { code: "WELCOME20", value: 20 },
        { code: "SAVE50", value: 50 },
      ],
    },
  });
}

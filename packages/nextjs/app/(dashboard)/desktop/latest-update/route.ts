import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { s3Client } from "@/lib/s3/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: env.AWS_PRIVATE_STORAGE_BUCKET_NAME,
      Key: "public/desktop-apps/update.json",
    }),
  );
  const updateJson = await response.Body?.transformToString();

  if (!updateJson) {
    return NextResponse.json({ error: "Update file not found" }, { status: 404 });
  }

  return NextResponse.json(JSON.parse(updateJson), {
    headers: {
      "Cache-Control": "no-cache",
    },
  });
}

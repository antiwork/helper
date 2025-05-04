import { S3Client } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";

export const s3Client = new S3Client({
  endpoint: env.AWS_ENDPOINT,
  region: env.AWS_DEFAULT_REGION,
  forcePathStyle: !!env.AWS_ENDPOINT,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

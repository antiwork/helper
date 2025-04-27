import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import type { TRPCRouterRecord } from "@trpc/server";
import mime from "mime";
import { z } from "zod";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { files } from "@/db/schema";
import { env } from "@/env";
import { s3Client } from "@/lib/s3/client";
import { generateS3Key, getS3Url } from "@/lib/s3/utils";
import { protectedProcedure } from "@/trpc/trpc";

const PUBLIC_ACL = "public-read";
const PRIVATE_ACL = "private";

const AWS_PRESIGNED_POST_FILE_MAX_SIZE = 26210000; // 25 MiB
const AWS_PRESIGNED_POST_EXPIRY = 600; // 10 minutes

export const filesRouter = {
  initiateUpload: protectedProcedure
    .input(
      z.object({
        file: z.object({
          fileName: z.string(),
          fileSize: z.number(),
          isInline: z.boolean(),
        }),
        conversationSlug: z.string().min(1),
      }),
    )
    .mutation(
      async ({
        input: {
          file: { fileName, fileSize, isInline },
          // We include the conversation slug in the URL purely for debugging purposes,
          // so it shouldn't be relied on for anything else.
          // We can't authorize it since, unlike sending a reply on an existing conversation,
          // the new conversation modal conversation won't exist yet (and its slug is generated on the frontend).
          conversationSlug: unauthorizedConversationSlug,
        },
      }) => {
        const isPublic = isInline;
        const contentType = mime.getType(fileName) ?? "application/octet-stream";
        const acl = isPublic ? PUBLIC_ACL : PRIVATE_ACL;

        const s3Key = generateS3Key(["attachments", unauthorizedConversationSlug], fileName);

        const signedRequest = await createPresignedPost(s3Client, {
          Bucket: env.AWS_PRIVATE_STORAGE_BUCKET_NAME,
          Key: s3Key,
          Conditions: [
            // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-HTTPPOSTConstructPolicy.html
            ["eq", "$Content-Type", contentType],
            ["eq", "$acl", acl],
            ["content-length-range", 0, AWS_PRESIGNED_POST_FILE_MAX_SIZE],
          ],
          Fields: {
            acl,
            "Content-Type": contentType,
          },
          Expires: AWS_PRESIGNED_POST_EXPIRY,
        });

        const fileRecord = await db
          .insert(files)
          .values({
            name: fileName,
            mimetype: contentType,
            size: fileSize,
            isInline,
            isPublic,
            url: getS3Url(s3Key),
          })
          .returning()
          .then(takeUniqueOrThrow);

        return {
          file: {
            slug: fileRecord.slug,
            name: fileRecord.name,
            url: fileRecord.url,
          },
          signedRequest,
        };
      },
    ),
} satisfies TRPCRouterRecord;

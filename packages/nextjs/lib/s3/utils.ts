import fs from "fs/promises";
import { DeleteObjectsCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { chunk } from "lodash";
import { env } from "@/env";
import { s3Client } from "@/lib/s3/client";

const BUCKET_NAME = env.AWS_PRIVATE_STORAGE_BUCKET_NAME;
const S3_ENDPOINT = `${env.AWS_ENDPOINT ?? "https://s3.amazonaws.com"}/${BUCKET_NAME}`;
const MAX_KEYS_PER_DELETE = 1000; // Maximum number of keys allowed in a single DeleteObjects request

export const s3UrlToS3Key = (s3Url: string) => s3Url.slice(S3_ENDPOINT.length + 1);

export const getFileStream = async (s3Url: string) => {
  const key = s3UrlToS3Key(s3Url);

  const command = new GetObjectCommand({
    Bucket: env.AWS_PRIVATE_STORAGE_BUCKET_NAME,
    Key: key,
  });

  const { Body } = await s3Client.send(command);
  if (!Body) throw new Error("Failed to download file from S3");

  return Body as NodeJS.ReadableStream;
};

export const downloadFile = async (s3Url: string, localPath: string) => {
  const fileStream = await getFileStream(s3Url);
  await fs.writeFile(localPath, fileStream);
};

export const uploadFile = async (content: Buffer, s3Key: string, contentType: string) => {
  const command = new PutObjectCommand({
    Bucket: env.AWS_PRIVATE_STORAGE_BUCKET_NAME,
    Key: s3Key,
    Body: content,
    ContentType: contentType,
  });

  await s3Client.send(command);

  return getS3Url(s3Key);
};

export const getS3Url = (s3Key: string) => {
  return `${S3_ENDPOINT}/${s3Key}`;
};

export const isS3Url = (url: string) => {
  return url.startsWith(`${S3_ENDPOINT}/`);
};

export const generateS3Key = (basePathParts: string[], fileName: string) => {
  return [...basePathParts, crypto.randomUUID(), fileName].join("/");
};

export const createPresignedDownloadUrl = (s3Url: string, expiration = 3600) => {
  const s3Key = s3UrlToS3Key(s3Url);

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: expiration });
};

export const deleteFiles = async (s3Urls: string[]) => {
  const keys = s3Urls.map((url) => ({ Key: s3UrlToS3Key(url) }));

  for (const chunkKeys of chunk(keys, MAX_KEYS_PER_DELETE)) {
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: { Objects: chunkKeys },
    });

    await s3Client.send(command);
  }
};

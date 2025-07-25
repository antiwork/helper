import { eq } from "drizzle-orm";
import { chunk } from "lodash-es";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import { files } from "@/db/schema";
import { triggerEvent } from "@/jobs/trigger";
import { captureExceptionAndLog } from "@/lib/shared/sentry";
import { createAdminClient } from "@/lib/supabase/server";

export const PUBLIC_BUCKET_NAME = "public-uploads";
export const PRIVATE_BUCKET_NAME = "private-uploads";

const MAX_KEYS_PER_DELETE = 1000;

export const getFileUrl = async (file: typeof files.$inferSelect, { preview = false }: { preview?: boolean } = {}) => {
  const supabase = createAdminClient();
  const key = preview ? file.previewKey : file.key;

  if (!key) throw new Error(`File ${file.id} has no ${preview ? "preview key" : "key"}`);

  try {
    if (file.isPublic) {
      const { data } = supabase.storage.from(PUBLIC_BUCKET_NAME).getPublicUrl(key);
      return data.publicUrl;
    }

    const { data, error } = await supabase.storage.from(PRIVATE_BUCKET_NAME).createSignedUrl(key, 60 * 60 * 24 * 30);
    if (error) throw error;
    return data.signedUrl;
  } catch (e) {
    captureExceptionAndLog(e);
    return null;
  }
};

export const formatAttachments = async (attachments: (typeof files.$inferSelect)[]) => {
  return (
    await Promise.all(
      attachments.map(async (attachment) => {
        const url = await getFileUrl(attachment);
        return url
          ? [
              {
                name: attachment.name,
                url,
                contentType: attachment.mimetype,
              },
            ]
          : [];
      }),
    )
  ).flat();
};

export const downloadFile = async (file: typeof files.$inferSelect) => {
  const supabase = createAdminClient();
  if (file.isPublic) {
    const response = await fetch(supabase.storage.from(PUBLIC_BUCKET_NAME).getPublicUrl(file.key).data.publicUrl);
    if (!response.ok) throw new Error(`Failed to download public file: ${file.key} (${response.statusText})`);
    return response.bytes();
  }

  const { data, error } = await supabase.storage.from(PRIVATE_BUCKET_NAME).download(file.key);
  if (error) throw error;
  return data.bytes();
};

export const uploadFile = async (
  key: string,
  data: Buffer,
  { mimetype, isPublic = false }: { mimetype?: string; isPublic?: boolean } = {},
) => {
  const supabase = createAdminClient();
  const { data: storedFile, error } = await supabase.storage
    .from(isPublic ? PUBLIC_BUCKET_NAME : PRIVATE_BUCKET_NAME)
    .upload(key, data, { contentType: mimetype });
  if (error) throw error;
  return storedFile.path;
};

export const generateKey = (basePathParts: string[], fileName: string) => {
  const sanitizedFileName = fileName.replace(/(^.*[\\/])|[^\w.-]/g, "_");
  return [...basePathParts, crypto.randomUUID(), sanitizedFileName].join("/");
};

export const finishFileUpload = async (
  {
    fileSlugs,
    messageId,
    noteId,
  }: {
    fileSlugs: string[];
    messageId?: number;
    noteId?: number;
  },
  tx: Transaction | typeof db = db,
) => {
  if (fileSlugs.length === 0) return;
  if (!messageId && !noteId) throw new Error("Either messageId or noteId must be provided");

  const fileIdsForPreview: number[] = [];

  await tx.transaction(async (tx) => {
    for (const slug of fileSlugs) {
      const file = await tx.query.files.findFirst({
        where: (files, { eq, isNull }) => eq(files.slug, slug) && isNull(files.messageId) && isNull(files.noteId),
      });

      if (!file) continue;

      await tx
        .update(files)
        .set(messageId ? { messageId } : { noteId })
        .where(eq(files.slug, slug))
        .execute();

      if (!file.isInline) fileIdsForPreview.push(file.id);
    }
  });

  if (fileIdsForPreview.length > 0) {
    await Promise.all(fileIdsForPreview.map((fileId) => triggerEvent("files/preview.generate", { fileId })));
  }
};

export const createAndUploadFile = async ({
  data,
  fileName,
  prefix,
  mimetype = "image/png",
  isInline = false,
  messageId,
  noteId,
}: {
  data: Buffer;
  fileName: string;
  prefix: string;
  mimetype?: string;
  isInline?: boolean;
  messageId?: number;
  noteId?: number;
}) => {
  const supabase = createAdminClient();
  const key = generateKey([prefix], fileName);
  const { data: storedFile, error } = await supabase.storage.from(PRIVATE_BUCKET_NAME).upload(key, data, {
    contentType: mimetype,
  });

  if (error) throw error;

  const file = await db
    .insert(files)
    .values({
      name: fileName,
      mimetype,
      size: data.length,
      isInline,
      isPublic: false,
      key: storedFile.path,
      messageId,
      noteId,
    })
    .returning()
    .then(takeUniqueOrThrow);

  if (!isInline) {
    await triggerEvent("files/preview.generate", { fileId: file.id });
  }

  return file;
};

export const deleteFiles = async (keys: string[], isPublic: boolean) => {
  const supabase = createAdminClient();
  for (const chunkKeys of chunk(keys, MAX_KEYS_PER_DELETE)) {
    const { error } = await supabase.storage
      .from(isPublic ? PUBLIC_BUCKET_NAME : PRIVATE_BUCKET_NAME)
      .remove(chunkKeys);
    if (error) throw error;
  }
};

import { eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, Transaction } from "@/db/client";
import { files } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { generateS3Key, uploadFile } from "@/lib/s3/utils";

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
    await inngest.send(
      fileIdsForPreview.map((fileId) => ({
        name: "files/preview.generate",
        data: { fileId },
      })),
    );
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
  const s3Key = generateS3Key([prefix], fileName);
  const s3Url = await uploadFile(data, s3Key, mimetype);

  const file = await db
    .insert(files)
    .values({
      name: fileName,
      mimetype,
      size: data.length,
      isInline,
      isPublic: false,
      url: s3Url,
      messageId,
      noteId,
    })
    .returning()
    .then(takeUniqueOrThrow);

  if (!isInline) {
    await inngest.send({
      name: "files/preview.generate",
      data: { fileId: file.id },
    });
  }

  return file;
};

import { subDays } from "date-fns";
import { and, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { files } from "@/db/schema/files";
import { deleteFiles } from "@/lib/data/files";

export const cleanupDanglingFiles = async () => {
  const oneDayAgo = subDays(new Date(), 1);

  const danglingFiles = await db
    .select({ id: files.id, key: files.key, previewKey: files.previewKey, isPublic: files.isPublic })
    .from(files)
    .where(and(lte(files.createdAt, oneDayAgo), isNull(files.messageId), isNull(files.noteId)));

  const getKeys = (files: typeof danglingFiles) =>
    files.flatMap((file) => [file.key, file.previewKey].filter((key): key is string => !!key));

  await deleteFiles(getKeys(danglingFiles.filter((file) => file.isPublic)), true);
  await deleteFiles(getKeys(danglingFiles.filter((file) => !file.isPublic)), false);

  const deleted = await db
    .delete(files)
    .where(
      inArray(
        files.id,
        danglingFiles.map((file) => file.id),
      ),
    )
    .returning({ id: files.id });

  return { deletedCount: deleted.length };
};

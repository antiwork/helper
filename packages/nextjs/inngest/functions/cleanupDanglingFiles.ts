import { subDays } from "date-fns";
import { and, inArray, isNull, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { files } from "@/db/schema/files";
import { inngest } from "@/inngest/client";
import { deleteFiles } from "@/lib/s3/utils";

export const cleanupDanglingFiles = async () => {
  const oneDayAgo = subDays(new Date(), 1);

  const danglingFiles = await db
    .select({ id: files.id, url: files.url, previewUrl: files.previewUrl })
    .from(files)
    .where(and(lte(files.createdAt, oneDayAgo), isNull(files.messageId), isNull(files.noteId)));

  const s3UrlsToDelete = danglingFiles.flatMap((file) =>
    [file.url, file.previewUrl].filter((url): url is string => !!url),
  );

  await deleteFiles(s3UrlsToDelete);

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

export default inngest.createFunction(
  { id: "cleanup-dangling-files" },
  { cron: "0 * * * *" }, // Every hour
  ({ step }) => step.run("delete", () => cleanupDanglingFiles()),
);

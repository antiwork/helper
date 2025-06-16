import fs from "fs/promises";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db/client";
import { files } from "@/db/schema";
import { downloadFile, generateKey, uploadFile } from "@/lib/data/files";

const PREVIEW_SIZE = { width: 500, height: 500 };
const PREVIEW_FORMAT = "png";

export const generateFilePreview = async ({ fileId }: { fileId: number }) => {
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });

  if (!file || !!file.previewKey) return;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "preview-"));
  const uuid = crypto.randomUUID();
  const tempFilePath = path.join(tempDir, uuid);
  const previewFilePath = path.join(tempDir, `preview_${uuid}.${PREVIEW_FORMAT}`);

  try {
    await fs.writeFile(tempFilePath, Buffer.from(await downloadFile(file)));

    if (file.mimetype.startsWith("image/")) {
      await sharp(tempFilePath).resize(PREVIEW_SIZE).toFormat(PREVIEW_FORMAT).toFile(previewFilePath);
    }

    if (await fs.stat(previewFilePath).catch(() => null)) {
      const key = generateKey(["previews"], file.name);
      const fileContent = await fs.readFile(previewFilePath);
      const finalKey = await uploadFile(key, fileContent, {
        mimetype: `image/${PREVIEW_FORMAT}`,
        isPublic: file.isPublic,
      });
      await db.update(files).set({ previewKey: finalKey }).where(eq(files.id, fileId));
    }

    return { message: `Preview for file ${fileId} generated successfully` };
  } finally {
    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

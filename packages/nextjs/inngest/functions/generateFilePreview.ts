import fs from "fs/promises";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db/client";
import { files } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { downloadFile, generateS3Key, uploadFile } from "@/lib/s3/utils";

const PREVIEW_SIZE = { width: 500, height: 500 };
const PREVIEW_FORMAT = "png";

export const generateFilePreview = async (fileId: number) => {
  const file = await db.query.files.findFirst({
    where: eq(files.id, fileId),
  });

  if (!file || !!file.previewUrl) return;

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "preview-"));
  const uuid = crypto.randomUUID();
  const tempFilePath = path.join(tempDir, uuid);
  const previewFilePath = path.join(tempDir, `preview_${uuid}.${PREVIEW_FORMAT}`);

  try {
    await downloadFile(file.url, tempFilePath);

    if (file.mimetype.startsWith("image/")) {
      await sharp(tempFilePath).resize(PREVIEW_SIZE).toFormat(PREVIEW_FORMAT).toFile(previewFilePath);
    }

    if (await fs.stat(previewFilePath).catch(() => null)) {
      const previewS3Key = generateS3Key(["previews"], file.name);
      const fileContent = await fs.readFile(previewFilePath);
      const previewUrl = await uploadFile(fileContent, previewS3Key, `image/${PREVIEW_FORMAT}`);
      await db.update(files).set({ previewUrl }).where(eq(files.id, fileId));
    }
  } finally {
    // Clean up temporary files
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

export default inngest.createFunction(
  { id: "generate-file-preview" },
  { event: "files/preview.generate" },
  async ({ event, step }) => {
    const { fileId } = event.data;

    await step.run("generate", () => generateFilePreview(fileId));

    return { message: `Preview for file ${fileId} generated successfully` };
  },
);

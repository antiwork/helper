import fs from "fs/promises";
import { fileFactory } from "@tests/support/factories/files";
import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { generateFilePreview } from "@/inngest/functions/generateFilePreview";
import { downloadFile, uploadFile } from "@/lib/s3/utils";

// Mock external dependencies
vi.mock("@/lib/s3/utils");
vi.mock("sharp");
vi.mock("fs/promises");

describe("generateFilePreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(downloadFile).mockResolvedValue(undefined);
    vi.mocked(uploadFile).mockResolvedValue("https://example.com/preview.png");
    vi.mocked(fs.mkdtemp).mockResolvedValue("/tmp/preview-123456");
    vi.mocked(fs.stat).mockResolvedValue({ isFile: () => true } as import("fs").Stats);
    vi.mocked(fs.rm).mockResolvedValue(undefined);
  });

  it("generates a preview for an image file", async () => {
    const { file } = await fileFactory.create(null, {
      name: "test.jpg",
      url: "https://example.com/test.jpg",
      mimetype: "image/jpeg",
      previewUrl: null,
    });

    vi.mocked(sharp).mockReturnValue({
      resize: vi.fn().mockReturnThis(),
      toFormat: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue(undefined),
    } as unknown as sharp.Sharp);

    await generateFilePreview(file.id);

    const updatedFile = await db.query.files.findFirst({
      where: (files, { eq }) => eq(files.id, file.id),
    });

    expect(downloadFile).toHaveBeenCalledWith("https://example.com/test.jpg", expect.any(String));
    expect(sharp).toHaveBeenCalled();
    expect(uploadFile).toHaveBeenCalled();
    expect(updatedFile?.previewUrl).toBe("https://example.com/preview.png");
  });

  it("does not generate a preview if the file already has a previewUrl", async () => {
    const { file } = await fileFactory.create(null, {
      name: "test.jpg",
      url: "https://example.com/test.jpg",
      mimetype: "image/jpeg",
      previewUrl: "https://example.com/existing-preview.png",
    });

    await generateFilePreview(file.id);

    expect(downloadFile).not.toHaveBeenCalled();
    expect(sharp).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("does not update the database and cleans up temporary files on error", async () => {
    const { file } = await fileFactory.create(null, {
      name: "test.jpg",
      url: "https://example.com/test.jpg",
      mimetype: "image/jpeg",
      previewUrl: null,
    });

    vi.mocked(sharp).mockReturnValue({
      resize: vi.fn().mockReturnThis(),
      toFormat: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockRejectedValue(new Error("Preview generation failed")),
    } as unknown as sharp.Sharp);

    await expect(generateFilePreview(file.id)).rejects.toThrow("Preview generation failed");

    expect(fs.rm).toHaveBeenCalledWith("/tmp/preview-123456", { recursive: true, force: true });
    expect(uploadFile).not.toHaveBeenCalled();

    const updatedFile = await db.query.files.findFirst({
      where: (files, { eq }) => eq(files.id, file.id),
    });
    expect(updatedFile?.previewUrl).toBeNull();
  });
});

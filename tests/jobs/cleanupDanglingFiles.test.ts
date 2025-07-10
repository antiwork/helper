import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { subDays } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { cleanupDanglingFiles } from "@/jobs/cleanupDanglingFiles";
import { deleteFiles } from "@/lib/data/files";

vi.mock("@/lib/data/files", () => ({
  deleteFiles: vi.fn(),
}));

describe("cleanupDanglingFiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deletes dangling files older than one day and their S3 objects", async () => {
    const twoDaysAgo = subDays(new Date(), 2);
    const yesterday = subDays(new Date(), 1);
    const today = new Date();

    const { file: oldFile1 } = await fileFactory.create(null, {
      createdAt: twoDaysAgo,
      previewKey: "oldFile1.png",
    });
    const { file: oldFile2 } = await fileFactory.create(null, { createdAt: yesterday });
    const { file: recentFile } = await fileFactory.create(null, { createdAt: today });

    const { conversation } = await conversationFactory.create();
    const { message } = await conversationMessagesFactory.create(conversation.id);
    const { file: associatedFile } = await fileFactory.create(message.id, { createdAt: twoDaysAgo });

    const result = await cleanupDanglingFiles();

    expect(result.deletedCount).toBe(2);
    const remainingFiles = await db.query.files.findMany();
    expect(remainingFiles.map(({ id }) => id).sort((a, b) => a - b)).toEqual(
      [recentFile.id, associatedFile.id].sort((a, b) => a - b),
    );

    expect(deleteFiles).toHaveBeenCalledTimes(2);
    expect(deleteFiles).toHaveBeenCalledWith([oldFile1.key, oldFile1.previewKey, oldFile2.key].filter(Boolean), false);
  });

  it("does not delete files if Supabase deletion fails", async () => {
    const twoDaysAgo = subDays(new Date(), 2);
    await fileFactory.create(null, { createdAt: twoDaysAgo });

    vi.mocked(deleteFiles).mockRejectedValueOnce(new Error("Deletion failed"));

    await expect(cleanupDanglingFiles()).rejects.toThrow("Deletion failed");

    const remainingFiles = await db.query.files.findMany();
    expect(remainingFiles.length).toEqual(1);
  });
});

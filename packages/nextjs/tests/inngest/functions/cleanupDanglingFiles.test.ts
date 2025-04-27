import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { userFactory } from "@tests/support/factories/users";
import { subDays } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { cleanupDanglingFiles } from "@/inngest/functions/cleanupDanglingFiles";
import * as s3Utils from "@/lib/s3/utils";

vi.mock("@/lib/s3/utils", () => ({
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
      previewUrl: "https://example.com/oldFile1.png",
    });
    const { file: oldFile2 } = await fileFactory.create(null, { createdAt: yesterday });
    const { file: recentFile } = await fileFactory.create(null, { createdAt: today });

    const { mailbox } = await userFactory.createRootUser();
    const { conversation } = await conversationFactory.create(mailbox.id);
    const { message } = await conversationMessagesFactory.create(conversation.id);
    const { file: associatedFile } = await fileFactory.create(message.id, { createdAt: twoDaysAgo });

    const result = await cleanupDanglingFiles();

    expect(result.deletedCount).toBe(2);
    const remainingFiles = await db.query.files.findMany();
    expect(remainingFiles.map(({ id }) => id).sort((a, b) => a - b)).toEqual(
      [recentFile.id, associatedFile.id].sort((a, b) => a - b),
    );

    expect(s3Utils.deleteFiles).toHaveBeenCalledTimes(1);
    expect(s3Utils.deleteFiles).toHaveBeenCalledWith([oldFile1.url, oldFile1.previewUrl, oldFile2.url].filter(Boolean));
  });

  it("does not delete files if S3 deletion fails", async () => {
    const twoDaysAgo = subDays(new Date(), 2);
    await fileFactory.create(null, { createdAt: twoDaysAgo });

    vi.mocked(s3Utils.deleteFiles).mockRejectedValueOnce(new Error("S3 deletion failed"));

    await expect(cleanupDanglingFiles()).rejects.toThrow("S3 deletion failed");

    const remainingFiles = await db.query.files.findMany();
    expect(remainingFiles.length).toEqual(1);
  });
});

import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { mockTriggerEvent } from "@tests/support/jobsUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { finishFileUpload } from "@/lib/data/files";

mockTriggerEvent();

describe("fileUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("finishFileUpload", () => {
    it("should update file entries and trigger preview generation", async () => {
      const { file: file1 } = await fileFactory.create(null, { isInline: true });
      const { file: file2 } = await fileFactory.create(null, { isInline: false });
      const { file: file3 } = await fileFactory.create(null);

      const { conversation } = await conversationFactory.create();
      const { message } = await conversationMessagesFactory.create(conversation.id);

      await finishFileUpload({ fileSlugs: [file1.slug, file2.slug], messageId: message.id });

      expect(
        await db.query.files.findFirst({
          where: (files, { eq }) => eq(files.id, file1.id),
        }),
      ).toMatchObject({ messageId: message.id });
      expect(
        await db.query.files.findFirst({
          where: (files, { eq }) => eq(files.id, file2.id),
        }),
      ).toMatchObject({ messageId: message.id });
      expect(
        await db.query.files.findFirst({
          where: (files, { eq }) => eq(files.id, file3.id),
        }),
      ).toMatchObject({ messageId: null });

      expect(mockTriggerEvent).toHaveBeenCalledTimes(1);
      expect(mockTriggerEvent).toHaveBeenCalledWith("files/preview.generate", {
        fileId: file2.id,
      });
    });

    it("should do nothing if no file slugs are provided", async () => {
      await finishFileUpload({ fileSlugs: [], messageId: 123 });

      expect(mockTriggerEvent).not.toHaveBeenCalled();
    });
  });
});

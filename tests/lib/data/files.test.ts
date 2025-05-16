import { conversationMessagesFactory } from "@tests/support/factories/conversationMessages";
import { conversationFactory } from "@tests/support/factories/conversations";
import { fileFactory } from "@tests/support/factories/files";
import { userFactory } from "@tests/support/factories/users";
import { mockInngest } from "@tests/support/inngestUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { finishFileUpload } from "@/lib/data/files";

const inngest = mockInngest();

describe("fileUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("finishFileUpload", () => {
    it("should update file entries and trigger preview generation", async () => {
      const { file: file1 } = await fileFactory.create(null, { isInline: true });
      const { file: file2 } = await fileFactory.create(null, { isInline: false });
      const { file: file3 } = await fileFactory.create(null);

      const { mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
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

      expect(inngest.send).toHaveBeenCalledTimes(1);
      expect(inngest.send).toHaveBeenCalledWith([
        {
          name: "files/preview.generate",
          data: { fileId: file2.id },
        },
      ]);
    });

    it("should do nothing if no file slugs are provided", async () => {
      await finishFileUpload({ fileSlugs: [], messageId: 123 });

      expect(inngest.send).not.toHaveBeenCalled();
    });
  });
});

import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminClient } from "@/lib/supabase/server";
import { createCaller } from "@/trpc";

vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: vi.fn(),
}));

describe("filesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const mockCreateSignedUploadUrl = vi.fn().mockResolvedValue({
      data: {
        path: "attachments/random_slug/test.txt",
        token: "test-token",
      },
      error: null,
    });

    const mockFrom = vi.fn().mockReturnValue({
      createSignedUploadUrl: mockCreateSignedUploadUrl,
    });

    const mockStorage = {
      from: mockFrom,
    };

    const mockSupabase = {
      storage: mockStorage,
    };

    (createAdminClient as any).mockReturnValue(mockSupabase);
  });

  describe("initiateUpload", () => {
    it("creates a file entry and returns a signed URL for inline files", async () => {
      const { user } = await userFactory.createRootUser();
      const ctx = await createTestTRPCContext(user);
      const caller = createCaller(ctx);

      const result = await caller.mailbox.conversations.files.initiateUpload({
        conversationSlug: "random_slug",
        file: {
          fileName: "test.txt",
          fileSize: 1000,
          isInline: true,
        },
      });

      expect(result.file).toMatchObject({
        name: "test.txt",
      });
      expect(result.file.key).toContain("random_slug");
      expect(result.bucket).toEqual("public-uploads");
      expect(result.signedUpload).toEqual({
        path: "attachments/random_slug/test.txt",
        token: "test-token",
      });
    });

    it("uses private bucket for non-inline files", async () => {
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create();
      const ctx = await createTestTRPCContext(user);
      const caller = createCaller(ctx);

      const result = await caller.mailbox.conversations.files.initiateUpload({
        conversationSlug: conversation.slug,
        file: {
          fileName: "private.txt",
          fileSize: 2000,
          isInline: false,
        },
      });

      expect(result.file).toMatchObject({
        name: "private.txt",
      });
      expect(result.bucket).toEqual("private-uploads");
    });
  });
});

import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { conversationFactory } from "@tests/support/factories/conversations";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { env } from "@/lib/env";
import { createCaller } from "@/trpc";

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-presigned-post", () => ({
  createPresignedPost: vi.fn().mockResolvedValue({
    url: "https://example.com/upload",
    fields: { key: "test-key" },
  }),
}));

describe("filesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initiateUpload", () => {
    it("creates a file entry and returns a signed URL for inline files", async () => {
      const { user } = await userFactory.createRootUser();
      const ctx = createTestTRPCContext(user);
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
        url: expect.stringMatching(
          /^https:\/\/s3\.amazonaws\.com\/.+\/attachments\/random_slug\/[a-z0-9\-]+\/test\.txt$/,
        ),
      });
      expect(result.file.url).toContain("random_slug");
      expect(result.signedRequest).toEqual({
        url: "https://example.com/upload",
        fields: { key: "test-key" },
      });

      expect(createPresignedPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: env.AWS_PRIVATE_STORAGE_BUCKET_NAME,
          Key: expect.stringMatching(/^attachments\/random_slug\/[a-z0-9\-]+\/test\.txt$/),
          Conditions: [
            ["eq", "$Content-Type", "text/plain"],
            ["eq", "$acl", "public-read"],
            ["content-length-range", 0, 26210000],
          ],
          Fields: {
            acl: "public-read",
            "Content-Type": "text/plain",
          },
          Expires: 600,
        }),
      );
    });

    it("uses private ACL for non-inline files", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      const ctx = createTestTRPCContext(user);
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
        url: expect.stringMatching(
          /^https:\/\/s3\.amazonaws\.com\/.+\/attachments\/[a-z0-9\-]+\/[a-z0-9\-]+\/private\.txt$/,
        ),
      });

      expect(createPresignedPost).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          Bucket: env.AWS_PRIVATE_STORAGE_BUCKET_NAME,
          Key: expect.stringMatching(/^attachments\/[a-z0-9\-]+\/[a-z0-9\-]+\/private\.txt$/),
          Conditions: [
            ["eq", "$Content-Type", "text/plain"],
            ["eq", "$acl", "private"],
            ["content-length-range", 0, 26210000],
          ],
          Fields: {
            acl: "private",
            "Content-Type": "text/plain",
          },
          Expires: 600,
        }),
      );
    });
  });
});

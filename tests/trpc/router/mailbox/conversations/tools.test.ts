import { conversationFactory } from "@tests/support/factories/conversations";
import { toolsFactory } from "@tests/support/factories/tools";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { callToolApi, ToolApiError } from "@/lib/tools/apiTool";
import { createCaller } from "@/trpc";

vi.mock("@/lib/tools/apiTool", () => ({
  callToolApi: vi.fn().mockResolvedValue({
    success: true,
    message: "Tool executed successfully",
    data: {
      message: "Tool executed successfully",
    },
  }),
  ToolApiError: vi.fn(),
}));

describe("toolsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns available tools for a conversation", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id, {
        suggestedActions: [
          {
            type: "tool",
            slug: "test-tool",
            parameters: {
              test: "params",
            },
          },
        ],
      });

      await toolsFactory.create({
        unused_mailboxId: mailbox.id,
        slug: "test-tool",
        name: "Test Tool",
        description: "A test tool",
        authenticationToken: "test-token",
      });

      const caller = createCaller(createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.tools.list({
        mailboxSlug: mailbox.slug,
        conversationSlug: conversation.slug,
      });

      expect(result.suggested).toEqual([
        {
          type: "tool",
          tool: {
            name: "Test Tool",
            slug: "test-tool",
            description: "A test tool",
            parameters: {
              test: "params",
            },
          },
        },
      ]);
    });
  });

  describe("run", () => {
    it("executes a tool, stores the result, and triggers draft refresh", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      await toolsFactory.create({
        unused_mailboxId: mailbox.id,
        slug: "test-tool",
      });

      const caller = createCaller(createTestTRPCContext(user));
      const params = { test: "params" };

      const result = await caller.mailbox.conversations.tools.run({
        mailboxSlug: mailbox.slug,
        conversationSlug: conversation.slug,
        tool: "test-tool",
        params,
      });

      expect(callToolApi).toHaveBeenCalledWith(conversation, expect.objectContaining({ slug: "test-tool" }), params);

      expect(result).toEqual({
        success: true,
        message: "Tool executed successfully",
        data: {
          message: "Tool executed successfully",
        },
      });
    });

    it("throws NOT_FOUND when tool does not exist", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);

      const caller = createCaller(createTestTRPCContext(user));
      await expect(
        caller.mailbox.conversations.tools.run({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
          tool: "non-existent-tool",
          params: {},
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("throws BAD_REQUEST when tool execution fails", async () => {
      const { user, mailbox } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create(mailbox.id);
      await toolsFactory.create({
        unused_mailboxId: mailbox.id,
        slug: "failing-tool",
      });

      vi.mocked(callToolApi).mockRejectedValueOnce(new ToolApiError("Tool execution failed", ""));

      const caller = createCaller(createTestTRPCContext(user));
      await expect(
        caller.mailbox.conversations.tools.run({
          mailboxSlug: mailbox.slug,
          conversationSlug: conversation.slug,
          tool: "failing-tool",
          params: {},
        }),
      ).rejects.toThrow("BAD_REQUEST");
    });
  });
});

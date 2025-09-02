import { conversationFactory } from "@tests/support/factories/conversations";
import { toolsFactory } from "@tests/support/factories/tools";
import { userFactory } from "@tests/support/factories/users";
import { createTestTRPCContext } from "@tests/support/trpcUtils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { callToolApi, ToolApiError } from "@/lib/tools/apiTool";
import { clientToolsFactory } from "@/tests/support/factories/clientTools";
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
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create({
        emailFrom: user.email,
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
        slug: "test-tool",
        name: "Test Tool",
        description: "A test tool",
        authenticationToken: "test-token",
      });

      await clientToolsFactory.create({
        customerEmail: user.email,
        name: "FirstTool",
        description: "A test client tool",
        serverRequestUrl: "https://first-tool.com",
        parameters: [],
      });

      const caller = createCaller(await createTestTRPCContext(user));
      const result = await caller.mailbox.conversations.tools.list({
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
      expect(result.all).toEqual([
        {
          name: "Test Tool",
          slug: "test-tool",
          description: "A test tool",
          parameterTypes: [],
          customerEmailParameter: null,
        },
        {
          name: "FirstTool",
          slug: "FirstTool",
          description: "A test client tool",
          parameterTypes: [],
          customerEmailParameter: null,
        },
      ]);
    });
  });

  describe("run", () => {
    it("executes a tool, stores the result, and triggers draft refresh", async () => {
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create();
      await toolsFactory.create({
        slug: "test-tool",
      });

      const caller = createCaller(await createTestTRPCContext(user));
      const params = { test: "params" };

      const result = await caller.mailbox.conversations.tools.run({
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
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create();

      const caller = createCaller(await createTestTRPCContext(user));
      await expect(
        caller.mailbox.conversations.tools.run({
          conversationSlug: conversation.slug,
          tool: "non-existent-tool",
          params: {},
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("throws BAD_REQUEST when tool execution fails", async () => {
      const { user } = await userFactory.createRootUser();
      const { conversation } = await conversationFactory.create();
      await toolsFactory.create({
        slug: "failing-tool",
      });

      vi.mocked(callToolApi).mockRejectedValueOnce(new ToolApiError("Tool execution failed", ""));

      const caller = createCaller(await createTestTRPCContext(user));
      await expect(
        caller.mailbox.conversations.tools.run({
          conversationSlug: conversation.slug,
          tool: "failing-tool",
          params: {},
        }),
      ).rejects.toThrow("BAD_REQUEST");
    });
  });
});

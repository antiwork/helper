import { describe, expect, it } from "vitest";
import { conversationMessages } from "@/db/schema";
import type { ToolMetadata } from "@/db/schema/conversationMessages";
import { buildMessagesFromHistory, buildToolMessages } from "@/lib/ai/messageBuilder";

describe("buildToolMessages", () => {
  it("creates tool call and result messages", () => {
    const message = {
      id: 123,
      cleanedUpText: "Tool result content",
      metadata: {
        tool: {
          id: 1,
          slug: "test-tool",
          name: "Test Tool",
          description: "Test Tool",
          requestMethod: "GET",
          url: "https://test.com",
        },
        parameters: { param1: "value1" },
        result: "raw result",
        success: true,
      } as ToolMetadata,
    } as typeof conversationMessages.$inferSelect;

    const [toolUseMessage, toolMessage] = buildToolMessages(message, message.cleanedUpText!);

    expect(toolUseMessage).toEqual({
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "tool_123",
          toolName: "test-tool",
          args: { param1: "value1" },
        },
      ],
    });

    expect(toolMessage).toEqual({
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "tool_123",
          toolName: "test-tool",
          result: {
            formatted: "Tool result content",
            raw: "raw result",
          },
        },
      ],
    });
  });
});

describe("buildMessagesFromHistory", () => {
  it("builds messages from conversation history", () => {
    const messages = [
      {
        role: "user",
        cleanedUpText: "User message",
      },
      {
        role: "ai_assistant",
        cleanedUpText: "Assistant message",
      },
    ] as (typeof conversationMessages.$inferSelect)[];

    const result = buildMessagesFromHistory(messages);

    expect(result).toEqual([
      { role: "user", content: "User message" },
      { role: "assistant", content: "Assistant message" },
    ]);
  });

  it("filters out empty messages", () => {
    const messages = [
      {
        role: "user",
        cleanedUpText: "  ",
      },
      {
        role: "ai_assistant",
        cleanedUpText: "Valid message",
      },
    ] as (typeof conversationMessages.$inferSelect)[];

    const result = buildMessagesFromHistory(messages);

    expect(result).toEqual([{ role: "assistant", content: "Valid message" }]);
  });
});

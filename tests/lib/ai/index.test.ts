import { userFactory } from "@tests/support/factories/users";
import { CoreMessage, CoreTool, GenerateTextResult } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { runAIObjectQuery, runAIQuery } from "@/lib/ai";
import * as core from "@/lib/ai/core";
import { trackAIUsageEvent } from "@/lib/data/aiUsageEvents";

vi.mock("@/lib/data/aiUsageEvents", () => ({
  trackAIUsageEvent: vi.fn(),
}));

const mockCompletionResponse = {
  text: "Mocked response",
  toolCalls: [],
  toolResults: [],
  finishReason: "stop",
  usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  warnings: [],
  steps: [],
  response: {
    id: "123",
    timestamp: new Date(),
    modelId: core.MINI_MODEL,
    messages: [],
  },
  logprobs: [],
  experimental_output: undefined as never,
  experimental_providerMetadata: {},
  request: {},
  reasoning: "",
  reasoningDetails: [],
  sources: [],
  providerMetadata: {},
  files: [],
} satisfies GenerateTextResult<Record<string, CoreTool>, undefined>;

describe("runAIQuery", () => {
  beforeEach(() => {
    vi.spyOn(core, "generateCompletion").mockResolvedValue(mockCompletionResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls generateCompletion with correct parameters", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const messages: CoreMessage[] = [{ role: "user", content: "Hello" }];

    await runAIQuery({
      messages,
      mailbox,
      queryType: "response_generator",
      maxTokens: 500,
    });

    expect(core.generateCompletion).toHaveBeenCalledWith({
      functionId: undefined,
      messages,
      model: core.CHAT_MODEL,
      temperature: 0,
      maxTokens: 500,
      maxSteps: undefined,
      system: undefined,
      tools: undefined,
      shortenPromptBy: undefined,
      metadata: {},
    });
  });

  it("uses custom parameters when provided", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const messages: CoreMessage[] = [{ role: "user", content: "Hello" }];

    await runAIQuery({
      messages,
      mailbox,
      queryType: "response_generator",
      model: "o4-mini-2025-04-16",
      system: "Custom system prompt",
      temperature: 0.5,
      maxTokens: 1000,
    });

    expect(core.generateCompletion).toHaveBeenCalledWith({
      functionId: undefined,
      system: "Custom system prompt",
      messages,
      model: "o4-mini-2025-04-16",
      temperature: 0.5,
      maxTokens: 1000,
      maxSteps: undefined,
      tools: undefined,
      shortenPromptBy: undefined,
      metadata: {},
    });
  });

  it("tracks AI usage event after successful completion", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const queryType = "response_generator";
    const model = "o4-mini-2025-04-16";

    vi.mocked(core.generateCompletion).mockResolvedValueOnce({
      text: "Test response",
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
      experimental_providerMetadata: {
        openai: {
          cachedPromptTokens: 0,
        },
      },
      reasoning: "",
      reasoningDetails: [],
      sources: [],
      providerMetadata: {},
      experimental_output: undefined as never,
      toolCalls: [],
      toolResults: [],
      finishReason: "stop",
      warnings: [],
      steps: [],
      response: {
        id: "123",
        timestamp: new Date(),
        modelId: model,
        messages: [],
      },
      logprobs: [],
      request: {},
      files: [],
    });

    await runAIQuery({
      messages: [{ role: "user", content: "Test" }],
      mailbox,
      queryType,
      model,
    });

    expect(trackAIUsageEvent).toHaveBeenCalledWith({
      mailbox,
      queryType,
      model,
      usage: {
        cachedTokens: 0,
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    });
  });

  it("retries on failure", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const messages: CoreMessage[] = [{ role: "user", content: "Hello" }];

    vi.spyOn(core, "generateCompletion")
      .mockRejectedValueOnce(new Error("API Error"))
      .mockResolvedValueOnce({ ...mockCompletionResponse, text: "Retry successful" });

    const result = await runAIQuery({
      messages,
      mailbox,
      queryType: "response_generator",
      maxTokens: 500,
    });

    expect(result.text).toBe("Retry successful");
    expect(core.generateCompletion).toHaveBeenCalledTimes(2);
  });
});

describe("runAIObjectQuery", () => {
  beforeEach(() => {
    vi.spyOn(core, "generateStructuredObject").mockResolvedValue({
      object: { name: "John Doe", age: 30 },
      toJsonResponse: () => {
        throw new Error("Not implemented");
      },
      ...mockCompletionResponse,
      providerMetadata: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls generateStructuredObject with correct parameters and returns the object", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const queryType = "conversation_summary";
    const model = "o4-mini-2025-04-16";

    vi.mocked(core.generateStructuredObject).mockResolvedValueOnce({
      object: { name: "John Doe", age: 30 },
      usage: {
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
      finishReason: "stop",
      warnings: [],
      request: {},
      response: {
        id: "123",
        timestamp: new Date(),
        modelId: model,
      },
      experimental_providerMetadata: {
        openai: {
          cachedPromptTokens: 100,
        },
      },
      providerMetadata: {},
      logprobs: [],
      toJsonResponse: () => {
        throw new Error("Not implemented");
      },
    });

    const result = await runAIObjectQuery({
      messages: [{ role: "user", content: "Test" }],
      mailbox,
      queryType,
      model,
      schema: z.object({ name: z.string(), age: z.number() }),
    });

    expect(result).toEqual({ name: "John Doe", age: 30 });

    expect(trackAIUsageEvent).toHaveBeenCalledWith({
      mailbox,
      queryType,
      model,
      usage: {
        cachedTokens: 100,
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      },
    });
  });
});

import { MockEmbeddingModelV1, MockLanguageModelV1 } from "ai/test";
import { isAIMockingEnabled } from "@/lib/env";

const createMockLanguageModel = () =>
  new MockLanguageModelV1({
    // eslint-disable-next-line require-await
    doGenerate: async () => ({
      text: "This is a mock response for testing purposes.",
      finishReason: "stop" as const,
      usage: { promptTokens: 10, completionTokens: 20 },
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
    // eslint-disable-next-line require-await
    doStream: async () => ({
      stream: new ReadableStream({
        start(controller) {
          controller.enqueue({ type: "text-delta" as const, textDelta: "Mock " });
          controller.enqueue({ type: "text-delta" as const, textDelta: "streaming " });
          controller.enqueue({ type: "text-delta" as const, textDelta: "response" });
          controller.enqueue({
            type: "finish" as const,
            finishReason: "stop" as const,
            logprobs: undefined,
            usage: { completionTokens: 3, promptTokens: 10 },
          });
          controller.close();
        },
      }),
      rawCall: { rawPrompt: null, rawSettings: {} },
    }),
  });

const createMockEmbeddingModel = () =>
  new MockEmbeddingModelV1({
    // eslint-disable-next-line require-await
    doEmbed: async () => ({
      embeddings: [
        Array(1536)
          .fill(0)
          .map(() => Math.random()),
      ],
      usage: { tokens: 10 },
      rawResponse: { headers: {} },
    }),
  });

export const createMockOpenAI = () => {
  if (!isAIMockingEnabled) {
    throw new Error(`Mock OpenAI should only be used in testing/CI environments`);
  }

  const mockProvider = Object.assign((_model: string) => createMockLanguageModel(), {
    chat: (_model: string) => createMockLanguageModel(),
    embedding: (_model: string) => createMockEmbeddingModel(),
  });

  return mockProvider;
};

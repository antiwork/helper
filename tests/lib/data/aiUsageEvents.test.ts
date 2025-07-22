import { mailboxFactory } from "@tests/support/factories/mailboxes";
import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { aiUsageEvents } from "@/db/schema";
import { trackAIUsageEvent } from "@/lib/data/aiUsageEvents";

describe("trackAIUsageEvent", () => {
  it("tracks AI usage event with provided mailbox", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const model = "o4-mini-2025-04-16";
    const queryType = "response_generator";
    const usage = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      cachedTokens: 0,
    };

    await trackAIUsageEvent({ mailbox, model, queryType, usage });

    const usageEvent = await db.query.aiUsageEvents.findFirst();
    expect(usageEvent).toMatchObject({
      modelName: model,
      queryType,
      inputTokensCount: 100,
      outputTokensCount: 50,
      cachedTokensCount: 0,
      cost: "0.0003300",
    });
  });

  it("tracks AI usage event with cached tokens", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const model = "o4-mini-2025-04-16";
    const queryType = "response_generator";
    const usage = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      cachedTokens: 60,
    };

    await trackAIUsageEvent({
      mailbox,
      model,
      queryType,
      usage,
    });

    const usageEvent = await db.query.aiUsageEvents.findFirst();
    expect(usageEvent).toMatchObject({
      modelName: model,
      queryType,
      inputTokensCount: usage.promptTokens,
      outputTokensCount: usage.completionTokens,
      cachedTokensCount: usage.cachedTokens,
      cost: "0.0002805",
    });
  });

  it("uses placeholder mailbox when mailbox is not provided", async () => {
    await mailboxFactory.create();
    const model = "o4-mini-2025-04-16";
    const queryType = "response_generator";
    const usage = {
      promptTokens: 200,
      completionTokens: 100,
      totalTokens: 300,
      cachedTokens: 100,
    };

    await trackAIUsageEvent({
      model,
      queryType,
      usage,
    });

    const usageEvent = await db.query.aiUsageEvents.findFirst();
    expect(usageEvent).toMatchObject({
      modelName: model,
      queryType,
      inputTokensCount: usage.promptTokens,
      outputTokensCount: usage.completionTokens,
      cachedTokensCount: usage.cachedTokens,
      cost: "0.0005775",
    });
  });

  it("calculates cost correctly for different models", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const testCases = [
      {
        model: "o4-mini-2025-04-16" as const,
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        expectedCost: "0.0033000",
      },
      {
        model: "o4-mini-2025-04-16" as const,
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        expectedCost: "0.0033000",
      },
    ];

    for (const testCase of testCases) {
      const usage = {
        promptTokens: testCase.inputTokens,
        completionTokens: testCase.outputTokens,
        totalTokens: testCase.inputTokens + testCase.outputTokens,
        cachedTokens: testCase.cachedTokens,
      };

      await trackAIUsageEvent({
        mailbox,
        model: testCase.model,
        queryType: "response_generator",
        usage,
      });

      const usageEvent = await db.query.aiUsageEvents.findFirst({
        where: eq(aiUsageEvents.modelName, testCase.model),
      });
      expect(usageEvent).toMatchObject({
        modelName: testCase.model,
        queryType: "response_generator",
        inputTokensCount: testCase.inputTokens,
        outputTokensCount: testCase.outputTokens,
        cachedTokensCount: testCase.cachedTokens,
        cost: testCase.expectedCost,
      });
    }
  });
});

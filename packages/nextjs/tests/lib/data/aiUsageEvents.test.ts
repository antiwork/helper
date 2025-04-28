import { userFactory } from "@tests/support/factories/users";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { aiUsageEvents } from "@/db/schema";
import { trackAIUsageEvent } from "@/lib/data/aiUsageEvents";

describe("trackAIUsageEvent", () => {
  it("tracks AI usage event with provided mailbox", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const model = "gpt-4o";
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
      mailboxId: mailbox.id,
      modelName: model,
      queryType,
      inputTokensCount: 100,
      outputTokensCount: 50,
      cachedTokensCount: 0,
      cost: "0.0007500",
    });
  });

  it("tracks AI usage event with cached tokens", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const model = "gpt-4o";
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
      mailboxId: mailbox.id,
      modelName: model,
      queryType,
      inputTokensCount: usage.promptTokens,
      outputTokensCount: usage.completionTokens,
      cachedTokensCount: usage.cachedTokens,
      cost: "0.0006750",
    });
  });

  it("uses placeholder mailbox when mailbox is not provided", async () => {
    const { mailbox: placeholderMailbox } = await userFactory.createRootUser();

    const model = "gpt-4o-mini";
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
      mailboxId: placeholderMailbox.id,
      modelName: model,
      queryType,
      inputTokensCount: usage.promptTokens,
      outputTokensCount: usage.completionTokens,
      cachedTokensCount: usage.cachedTokens,
      cost: "0.0000825",
    });
  });

  it("calculates cost correctly for different models", async () => {
    const { mailbox } = await userFactory.createRootUser();
    const testCases = [
      {
        model: "gpt-4o-mini" as const,
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        expectedCost: "0.0004500",
      },
      {
        model: "gpt-4o" as const,
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        expectedCost: "0.0075000",
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
        mailboxId: mailbox.id,
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

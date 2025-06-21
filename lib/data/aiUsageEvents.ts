import { GenerateTextResult } from "ai";
import { db } from "@/db/client";
import { aiUsageEvents } from "@/db/schema/aiUsageEvents";

const MODEL_TOKEN_COST = {
  "gpt-4o-mini": { input: 0.00000015, cachedInput: 0.000000075, output: 0.0000006 },
  "gpt-4o": { input: 0.0000025, cachedInput: 0.00000125, output: 0.00001 },
  "gpt-4.1": { input: 0.000002, cachedInput: 0.0000005, output: 0.000008 },
  "gpt-4.1-mini": { input: 0.0000004, cachedInput: 0.0000001, output: 0.0000016 },
  "fireworks/deepseek-r1": { input: 0.000003, cachedInput: 0.000003, output: 0.000008 },
};

export const trackAIUsageEvent = async ({
  model,
  queryType,
  usage,
}: {
  model: keyof typeof MODEL_TOKEN_COST;
  queryType: (typeof aiUsageEvents.$inferSelect)["queryType"];
  usage: GenerateTextResult<any, any>["usage"] & { cachedTokens: number };
}) => {
  const inputTokensCount = usage.promptTokens;
  const outputTokensCount = usage.completionTokens;
  const cachedTokensCount = usage.cachedTokens ?? 0;

  const modelCosts = MODEL_TOKEN_COST[model];
  const cachedInputCost = cachedTokensCount * modelCosts.cachedInput;
  const inputCost = (inputTokensCount - cachedTokensCount) * modelCosts.input;
  const outputCost = outputTokensCount * modelCosts.output;
  const totalCost = cachedInputCost + inputCost + outputCost;

  await db.insert(aiUsageEvents).values({
    modelName: model,
    queryType,
    inputTokensCount,
    outputTokensCount,
    cachedTokensCount,
    cost: totalCost.toFixed(7),
  });
};

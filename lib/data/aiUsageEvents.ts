import { GenerateTextResult } from "ai";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { aiUsageEvents } from "@/db/schema/aiUsageEvents";
import { mailboxes } from "@/db/schema/mailboxes";
import { getMailbox } from "@/lib/data/mailbox";

const MODEL_TOKEN_COST = {
  "o4-mini-2025-04-16": { input: 0.0000011, cachedInput: 0.000000275, output: 0.0000044 },
  "gpt-4o-mini": { input: 0.00000015, cachedInput: 0.000000075, output: 0.0000006 },
  "gpt-4o": { input: 0.0000025, cachedInput: 0.00000125, output: 0.00001 },
  "gpt-4.1": { input: 0.000002, cachedInput: 0.0000005, output: 0.000008 },
  "gpt-4.1-mini": { input: 0.0000004, cachedInput: 0.0000001, output: 0.0000016 },
  "gpt-5": { input: 1.25 / 1_000_000, cachedInput: 0.125 / 1_000_000, output: 10 / 1_000_000 },
  "gpt-5-mini": { input: 0.25 / 1_000_000, cachedInput: 0.025 / 1_000_000, output: 2 / 1_000_000 },
  "fireworks/deepseek-r1": { input: 0.000003, cachedInput: 0.000003, output: 0.000008 },
};

export const trackAIUsageEvent = async ({
  mailbox,
  model,
  queryType,
  usage,
}: {
  mailbox?: typeof mailboxes.$inferSelect;
  model: keyof typeof MODEL_TOKEN_COST;
  queryType: (typeof aiUsageEvents.$inferSelect)["queryType"];
  usage: GenerateTextResult<any, any>["usage"] & { cachedTokens: number };
}) => {
  const inputTokensCount = usage.promptTokens;
  const outputTokensCount = usage.completionTokens;
  const cachedTokensCount = usage.cachedTokens ?? 0;

  mailbox ??= assertDefined(await getMailbox());

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

import { GenerateTextResult } from "ai";
import { eq } from "drizzle-orm";
import { HELPER_SUPPORT_MAILBOX_ID } from "@/components/constants";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { aiUsageEvents } from "@/db/schema/aiUsageEvents";
import { mailboxes } from "@/db/schema/mailboxes";
import { env } from "@/lib/env";

const MODEL_TOKEN_COST = {
  "gpt-4o-mini": { input: 0.00000015, cachedInput: 0.000000075, output: 0.0000006 },
  "gpt-4o": { input: 0.0000025, cachedInput: 0.00000125, output: 0.00001 },
  "gpt-4.1": { input: 0.000002, cachedInput: 0.0000005, output: 0.000008 },
  "gpt-4.1-mini": { input: 0.0000004, cachedInput: 0.0000001, output: 0.0000016 },
  o3: { input: 0.000002, cachedInput: 0.0000005, output: 0.000008 },
  "fireworks/deepseek-r1": { input: 0.000003, cachedInput: 0.000003, output: 0.000008 },
};

const getPlaceholderMailbox = async () => {
  if (env.NODE_ENV === "production") {
    return await db.query.mailboxes.findFirst({
      where: eq(mailboxes.id, HELPER_SUPPORT_MAILBOX_ID),
    });
  }
  return await db.query.mailboxes.findFirst();
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

  mailbox ??= assertDefined(await getPlaceholderMailbox());

  const modelCosts = MODEL_TOKEN_COST[model];
  const cachedInputCost = cachedTokensCount * modelCosts.cachedInput;
  const inputCost = (inputTokensCount - cachedTokensCount) * modelCosts.input;
  const outputCost = outputTokensCount * modelCosts.output;
  const totalCost = cachedInputCost + inputCost + outputCost;

  await db.insert(aiUsageEvents).values({
    mailboxId: mailbox.id,
    modelName: model,
    queryType,
    inputTokensCount,
    outputTokensCount,
    cachedTokensCount,
    cost: totalCost.toFixed(7),
  });
};

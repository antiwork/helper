import { eq } from "drizzle-orm";
import { encode } from "gpt-tokenizer/model/gpt-4o";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema";
import { conversations } from "@/db/schema/conversations";
import { generateCompletion, generateEmbedding } from "@/lib/ai";
import { cleanUpTextForAI, MINI_MODEL } from "@/lib/ai/core";

const SYSTEM_PROMPT = `You will be given a support conversation between a customer and a support agent. Your task is to summarize this conversation while removing any sensitive or personally identifiable information. 
Format in a way that it can be used as source of information for future conversations. PRIORITIZE concrete, actionable details over general conversation flow.

Follow these steps to create the summary:

1. Extract specific details: product names, purchase information, account details, transaction data
2. Identify the main question or issue the customer was experiencing
3. Determine the solution or resolution provided by the support agent
4. Remove any specific names, email addresses, amounts, phone numbers, account numbers, or other personally identifiable information

Your response should include:
1. Summary: Focus on concrete details and specific actions taken, not general conversation flow
2. Agent Action: If the agent acted to fix the issue other than giving instructions
3. User Action: If the problem was or can be solved by a user action
4. Sample Answer: A template response that could be used for similar cases

Format your response as:
Summary: [Your summary here focusing on concrete details]
Agent Action: [Action taken by agent, if any]
User Action: [Action needed from user, if any]
Sample Answer: [Template response]`;

const GPT_4O_MINI_CONTEXT_WINDOW_MAX_TOKENS = 128000;

export class PromptTooLongError extends Error {
  constructor(conversationId: number) {
    super(`Prompt for conversation ${conversationId} is too long`);
  }
}

export const createConversationEmbedding = async (conversationId: number) => {
  const messages = await db.query.conversationMessages.findMany({
    where: eq(conversationMessages.conversationId, conversationId),
  });

  const messagesFormatted: string[] = messages.map((m) => {
    const role = m.role === "user" ? "Customer" : "Agent";
    return `${role}: ${cleanUpTextForAI(m.cleanedUpText ?? m.body ?? "")}`;
  });

  const prompt = `Conversation:\n${messagesFormatted.join("\n")}`;
  const tokenCount = encode(SYSTEM_PROMPT + prompt).length;
  if (tokenCount > GPT_4O_MINI_CONTEXT_WINDOW_MAX_TOKENS - 100) {
    throw new PromptTooLongError(conversationId);
  }
  const { text } = await generateCompletion({
    system: SYSTEM_PROMPT,
    prompt,
    functionId: "summary-embedding-conversation",
    model: MINI_MODEL,
  });
  const embedding = await generateEmbedding(text, "embedding-conversation", { skipCache: true });

  return await db
    .update(conversations)
    .set({
      embedding,
      embeddingText: text,
    })
    .where(eq(conversations.id, conversationId))
    .returning()
    .then(takeUniqueOrThrow);
};

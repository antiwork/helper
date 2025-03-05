import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, conversations } from "@/db/schema";
import { env } from "@/env";
import { inngest } from "@/inngest/client";
import { runAIQuery } from "@/lib/ai";
import { loadPreviousMessages } from "@/lib/ai/chat";
import { GPT_4O_MINI_MODEL } from "@/lib/ai/core";

const RESOLUTION_CHECK_PROMPT = `You are analyzing a customer service conversation to determine if the customer's issue was resolved.

Consider the conversation resolved by default unless there are clear signs it isn't. Only mark as unresolved if:
1) The customer explicitly expresses dissatisfaction or frustration
2) The response is completely unrelated to the customer's question
3) The customer has a clear follow-up question that wasn't addressed at all

Respond with 'true: [reason]' or 'false: [reason]' where [reason] is a brief explanation of your decision.
Default to 'true' if uncertain.`;

const checkAIBasedResolution = async (conversationId: number) => {
  const messages = await loadPreviousMessages(conversationId);
  const { mailbox } = assertDefined(
    await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: { mailbox: true },
    }),
  );

  const aiResponse = await runAIQuery({
    messages: messages.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    })),
    mailbox,
    queryType: "reasoning",
    model: GPT_4O_MINI_MODEL,
    system: RESOLUTION_CHECK_PROMPT,
    temperature: 0.1,
    maxTokens: 100,
  });

  const [isResolved, reason] = aiResponse.trim().toLowerCase().split(": ");
  return { isResolved: isResolved === "true", reason };
};

const skipCheck = async (conversationId: number, messageId: number) => {
  const newerMessage = await db.query.conversationMessages.findFirst({
    where: and(eq(conversationMessages.conversationId, conversationId), gt(conversationMessages.id, messageId)),
  });

  if (newerMessage) return `Has newer message: ${newerMessage.id}`;

  const event = await db.query.conversationEvents.findFirst({
    where: and(
      eq(conversationEvents.conversationId, conversationId),
      inArray(conversationEvents.type, ["resolved_by_ai", "request_human_support"]),
    ),
  });

  if (event) return `Has event: ${event.type}`;

  const humanResponse = await db.query.conversationMessages.findFirst({
    columns: { id: true },
    where: and(eq(conversationMessages.conversationId, conversationId), eq(conversationMessages.role, "staff")),
  });

  if (humanResponse) return `Has human response: ${humanResponse.id}`;
};

export const checkConversationResolution = async (conversationId: number, messageId: number) => {
  const skipReason = await skipCheck(conversationId, messageId);
  if (skipReason) return { skipped: true, reason: skipReason };

  const lastReaction = (
    await db.query.conversationMessages.findFirst({
      where: and(
        eq(conversationMessages.conversationId, conversationId),
        eq(conversationMessages.role, "ai_assistant"),
      ),
      orderBy: [desc(conversationMessages.id)],
    })
  )?.reactionType;

  if (lastReaction === "thumbs-up") {
    await db.insert(conversationEvents).values({
      conversationId,
      type: "resolved_by_ai",
      changes: {},
      reason: "Positive reaction with no follow-up questions.",
    });
    return { isResolved: true, reason: "Positive reaction" };
  } else if (lastReaction === "thumbs-down") {
    return { isResolved: false, reason: "Negative reaction" };
  }

  const { isResolved, reason } = await checkAIBasedResolution(conversationId);

  if (isResolved) {
    await db.insert(conversationEvents).values({
      conversationId,
      type: "resolved_by_ai",
      changes: {},
      reason: "No customer follow-up after 24 hours.",
    });
  }

  return { isResolved, reason };
};

export default inngest.createFunction(
  { id: "check-conversation-resolution" },
  { event: "conversations/check-resolution" },
  async ({ event, step }) => {
    const { conversationId, messageId } = event.data;

    if (env.NODE_ENV === "development") {
      await step.sleepUntil("wait-5-minutes", new Date(Date.now() + 5 * 60 * 1000));
    } else {
      await step.sleepUntil("wait-24-hours", new Date(Date.now() + 24 * 60 * 60 * 1000));
    }

    const result = await step.run("check-resolution", async () => {
      return await checkConversationResolution(conversationId, messageId);
    });

    return result;
  },
);

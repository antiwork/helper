import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { conversationEvents, conversationMessages, conversations } from "@/db/schema";
import { inngest } from "@/inngest/client";
import { runAIQuery } from "@/lib/ai";
import { loadPreviousMessages } from "@/lib/ai/chat";
import { GPT_4O_MINI_MODEL } from "@/lib/ai/core";
import { Mailbox } from "@/lib/data/mailbox";
import { env } from "@/lib/env";

const RESOLUTION_CHECK_PROMPT = `You are analyzing a customer service conversation to determine if the customer's issue was addressed.

Respond with one of:
- 'bad: [reason]' if the customer explicitly expresses dissatisfaction or frustration, or if the response is unrelated to the customer's question
- 'ok: [reason]' otherwise

Where [reason] is a brief explanation of your decision.

Just check if the assistant has provided information generally relevant to the customer's issue - it doesn't need to be an exact match.`;

const checkAIBasedResolution = async (conversationId: number, mailbox: Mailbox) => {
  const messages = await loadPreviousMessages(conversationId);

  const aiResponse = (
    await runAIQuery({
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
    })
  ).text;

  const [isResolved, reason] = aiResponse.trim().toLowerCase().split(": ");
  return { isResolved: isResolved !== "bad", reason };
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

  const conversation = assertDefined(
    await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: { mailbox: true },
    }),
  );

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

  const { isResolved, reason } = await checkAIBasedResolution(conversationId, conversation.mailbox);

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

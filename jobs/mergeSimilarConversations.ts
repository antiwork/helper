import { and, eq, inArray, isNull, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationEvents } from "@/db/schema";
import { conversationMessages } from "@/db/schema/conversationMessages";
import { conversations } from "@/db/schema/conversations";
import { runAIObjectQuery } from "@/lib/ai";
import { MINI_MODEL } from "@/lib/ai/core";
import { getMailbox } from "@/lib/data/mailbox";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

export const mergeSimilarConversations = async ({ messageId }: { messageId: number }) => {
  const conversation = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversations.findFirst({
      where: inArray(
        conversations.id,
        db
          .select({ id: conversationMessages.conversationId })
          .from(conversationMessages)
          .where(eq(conversationMessages.id, messageId)),
      ),
      with: {
        messages: {
          columns: {
            id: true,
            role: true,
            cleanedUpText: true,
            createdAt: true,
          },
          orderBy: (messages, { asc }) => [asc(messages.createdAt)],
        },
        events: {
          where: eq(conversationEvents.type, "request_human_support"),
          columns: {
            createdAt: true,
          },
        },
      },
    }),
  );

  if (!conversation.emailFrom) return { message: "Skipped: no email from" };
  if (conversation.mergedIntoId) return { message: "Skipped: conversation is already merged" };

  const userMessageCount = conversation.messages.filter((m) => m.role === "user").length;
  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const escalatedAfterLastMessage =
    !!lastMessage && conversation.events.some((e) => e.createdAt > lastMessage.createdAt);

  if (
    !(
      (conversation.isPrompt && userMessageCount === 2) ||
      (!conversation.isPrompt && userMessageCount === 1) ||
      escalatedAfterLastMessage
    )
  ) {
    return { message: "Skipped: not the first message and not immediately after escalation" };
  }

  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());

  const otherConversations = await db.query.conversations.findMany({
    where: and(
      eq(conversations.emailFrom, conversation.emailFrom),
      not(eq(conversations.id, conversation.id)),
      isNull(conversations.mergedIntoId),
      eq(conversations.status, "open"),
    ),
    with: {
      messages: {
        columns: {
          id: true,
          role: true,
          cleanedUpText: true,
          createdAt: true,
        },
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
      },
    },
    orderBy: (conversations, { desc }) => [desc(conversations.createdAt)],
    limit: 10,
  });

  if (otherConversations.length === 0) {
    return { message: "No other conversations from this customer found" };
  }

  const currentConversationText = `
Current Conversation (ID: ${conversation.id})
Subject: ${conversation.subject || "(no subject)"}
Created: ${conversation.createdAt.toISOString()}
Status: ${conversation.status}
Messages:
${conversation.messages
  .map((msg) => `- ${msg.role === "user" ? "Customer" : "Assistant"}: ${msg.cleanedUpText ?? ""}`)
  .join("\n")
  .slice(0, 10000)}
    `;

  const otherConversationsText = otherConversations
    .map((conv) => {
      return `
Conversation (ID: ${conv.id})
Subject: ${conv.subject || "(no subject)"}
Created: ${conv.createdAt.toISOString()}
Status: ${conv.status}
Messages:
${conv.messages
  .map((msg) => `- ${msg.role === "user" ? "Customer" : "Assistant"}: ${msg.cleanedUpText ?? ""}`)
  .join("\n")
  .slice(0, 10000)}
      `;
    })
    .join("\n");

  const systemMessage = `
You are an assistant tasked with determining if a conversation should be merged into another existing conversation.
Only merge conversations if they are clearly about the same topic or issue from the same customer.
Consider the subject, message content, and timing of the conversations.
Don't merge if they appear to be distinct topics or issues.
Return a JSON object that will be validated against a schema with these fields:
- shouldMerge: boolean indicating if the conversations should be merged
- mergeIntoId: number representing the conversation ID to merge into, or null if no merge is needed
- reason: string explaining your decision
    `;

  const userMessage = `
I need to determine if the current conversation should be merged into one of the other existing conversations from the same customer.

${currentConversationText}

Other conversations from the same customer:
${otherConversationsText}

Should the current conversation be merged into any of the others? If so, which one?
`;

  const result = await runAIObjectQuery({
    messages: [{ role: "user", content: userMessage }],
    mailbox,
    queryType: "merge_similar_conversations",
    schema: z.object({
      shouldMerge: z.boolean(),
      mergeIntoId: z.number().nullable(),
      reason: z.string(),
    }),
    model: MINI_MODEL,
    system: systemMessage,
    temperature: 0.0,
    maxTokens: 500,
    functionId: "merge-similar-conversations",
  });

  if (result.shouldMerge && result.mergeIntoId) {
    const mergeIntoId = typeof result.mergeIntoId === "string" ? parseInt(result.mergeIntoId, 10) : result.mergeIntoId;

    const targetConversation = otherConversations.find((c) => c.id === mergeIntoId);
    if (!targetConversation) {
      return { message: `Invalid merge target ID: ${mergeIntoId}` };
    }

    await db.update(conversations).set({ mergedIntoId: mergeIntoId }).where(eq(conversations.id, conversation.id));
    if (conversation.lastUserEmailCreatedAt) {
      const lastUserEmailCreatedAt = new Date(
        Math.max(
          conversation.lastUserEmailCreatedAt.getTime(),
          ...(targetConversation.lastUserEmailCreatedAt ? [targetConversation.lastUserEmailCreatedAt.getTime()] : []),
        ),
      );
      await db
        .update(conversations)
        .set({
          lastUserEmailCreatedAt,
          lastReadAt:
            lastUserEmailCreatedAt && targetConversation.lastReadAt
              ? new Date(Math.max(lastUserEmailCreatedAt.getTime(), targetConversation.lastReadAt.getTime()))
              : (lastUserEmailCreatedAt ?? targetConversation.lastReadAt),
        })
        .where(eq(conversations.id, mergeIntoId));
    }

    return {
      message: `Conversation ${conversation.id} merged into ${mergeIntoId}`,
      reason: result.reason,
    };
  }

  return {
    message: "No merge needed",
    reason: result.reason,
  };
};

import { and, eq, isNull, not } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { inngest } from "@/inngest/client";
import { runAIObjectQuery } from "@/lib/ai";
import { getMailboxById } from "@/lib/data/mailbox";
import { assertDefinedOrRaiseNonRetriableError } from "../utils";

export default inngest.createFunction(
  {
    id: "detect-similar-conversations",
    debounce: { key: "event.data.messageId", period: "1m", timeout: "5m" },
  },
  { event: "conversations/embedding.generated" },
  async ({ event }) => {
    const { conversationId } = event.data;

    const conversation = assertDefinedOrRaiseNonRetriableError(
      await db.query.conversations.findFirst({
        where: eq(conversations.id, conversationId),
        with: {
          messages: {
            columns: {
              id: true,
              role: true,
              cleanedUpText: true,
            },
          },
        },
      }),
    );

    if (!conversation.emailFrom) return { message: "Skipped: no email from" };
    if (!conversation.embedding) return { message: "Skipped: no embedding text" };
    if (conversation.mergedIntoId) return { message: "Skipped: conversation is already merged" };

    const userMessageCount = conversation.messages.filter((m) => m.role === "user").length;
    if ((conversation.isPrompt && userMessageCount !== 2) || (!conversation.isPrompt && userMessageCount !== 1)) {
      return { message: "Skipped: not the first message" };
    }

    const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailboxById(conversation.mailboxId));

    const otherConversations = await db.query.conversations.findMany({
      where: and(
        eq(conversations.emailFrom, conversation.emailFrom),
        not(eq(conversations.id, conversation.id)),
        isNull(conversations.mergedIntoId),
        not(eq(conversations.status, "spam")),
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
      limit: 5,
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
  .map((msg) => {
    const role = msg.role === "user" ? "Customer" : "Assistant";
    const content = msg.cleanedUpText ?? "";
    return `- ${role}: ${content.substring(0, 300)}${content.length > 300 ? "..." : ""}`;
  })
  .join("\n")}
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
  .map((msg) => {
    const role = msg.role === "user" ? "Customer" : "Assistant";
    const content = msg.cleanedUpText ?? "";
    return `- ${role}: ${content.substring(0, 300)}${content.length > 300 ? "..." : ""}`;
  })
  .join("\n")}
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
      queryType: "reasoning",
      schema: z.object({
        shouldMerge: z.boolean(),
        mergeIntoId: z.number().nullable(),
        reason: z.string(),
      }),
      model: "gpt-4o",
      system: systemMessage,
      temperature: 0.0,
      maxTokens: 500,
      functionId: "merge-similar-conversations",
    });

    if (result.shouldMerge && result.mergeIntoId) {
      const mergeIntoId =
        typeof result.mergeIntoId === "string" ? parseInt(result.mergeIntoId, 10) : result.mergeIntoId;

      const targetConversation = otherConversations.find((c) => c.id === mergeIntoId);
      if (!targetConversation) {
        return { message: `Invalid merge target ID: ${mergeIntoId}` };
      }

      await db.update(conversations).set({ mergedIntoId: mergeIntoId }).where(eq(conversations.id, conversation.id));

      return {
        message: `Conversation ${conversation.id} merged into ${mergeIntoId}`,
        reason: result.reason,
      };
    }

    return {
      message: "No merge needed",
      reason: result.reason,
    };
  },
);

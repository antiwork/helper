import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { decryptFieldValue } from "@/db/lib/encryptedField";
import { conversationMessages, conversations as conversationsTable } from "@/db/schema";
import type { mailboxes } from "@/db/schema/mailboxes";
import { runAIObjectQuery } from "@/lib/ai";
import { searchConversations } from "@/lib/data/conversation/search";

const commonIssuesGenerationSchema = z.object({
  issues: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      reasoning: z.string(),
    }),
  ),
});

type CommonIssuesGeneration = z.infer<typeof commonIssuesGenerationSchema>;

export const generateCommonIssuesSuggestions = async (
  mailbox: typeof mailboxes.$inferSelect,
): Promise<CommonIssuesGeneration> => {
  const { list } = await searchConversations(mailbox, {
    limit: 100,
    status: ["open", "closed"],
    sort: "newest",
  });

  const { results: conversations } = await list;

  if (conversations.length === 0) {
    return { issues: [] };
  }

  const conversationIds = conversations
    .filter((conv) => conv !== undefined)
    .slice(0, 50)
    .map((conv) => conv.id);

  // Get conversations with both first and recent messages
  const conversationsWithMessages = await db
    .select({
      conversation_id: conversationsTable.id,
      conversation_subject: conversationsTable.subject,
      conversation_status: conversationsTable.status,
      first_message_cleanedUpText: sql<string | null>`first_message.cleaned_up_text`,
      recent_message_cleanedUpText: sql<string | null>`recent_message.cleaned_up_text`,
    })
    .from(conversationsTable)
    .leftJoin(
      sql`LATERAL (
        SELECT
          ${conversationMessages.cleanedUpText} as cleaned_up_text
        FROM ${conversationMessages}
        WHERE ${and(eq(conversationMessages.conversationId, conversationsTable.id), eq(conversationMessages.role, "user"))}
        ORDER BY ${asc(conversationMessages.createdAt)}
        LIMIT 1
      ) as first_message`,
      sql`true`,
    )
    .leftJoin(
      sql`LATERAL (
        SELECT
          ${conversationMessages.cleanedUpText} as cleaned_up_text
        FROM ${conversationMessages}
        WHERE ${and(eq(conversationMessages.conversationId, conversationsTable.id), inArray(conversationMessages.role, ["user", "staff"]))}
        ORDER BY ${desc(conversationMessages.createdAt)}
        LIMIT 1
      ) as recent_message`,
      sql`true`,
    )
    .where(inArray(conversationsTable.id, conversationIds));

  const conversationSummaries = conversationsWithMessages
    .map(
      ({
        conversation_id,
        conversation_subject,
        conversation_status,
        first_message_cleanedUpText,
        recent_message_cleanedUpText,
      }) => {
        let firstMessage = "";
        let recentMessage = "";

        // Decrypt first message with error handling
        if (first_message_cleanedUpText) {
          try {
            firstMessage = decryptFieldValue(first_message_cleanedUpText);
          } catch {
            firstMessage = "";
          }
        }

        // Decrypt recent message with error handling
        if (recent_message_cleanedUpText) {
          try {
            recentMessage = decryptFieldValue(recent_message_cleanedUpText);
          } catch {
            recentMessage = "";
          }
        }

        return {
          subject: conversation_subject,
          firstMessage,
          recentMessage,
          status: conversation_status,
        };
      },
    )
    .filter((conv) => conv.subject || conv.firstMessage || conv.recentMessage);

  const systemPrompt = `
You are analyzing customer support conversations to identify common issue patterns that should be grouped together.

Based on the conversation data provided, identify 3-7 common issue categories that would help organize and track recurring customer problems.

For each common issue category you identify:
1. Create a clear, concise title (2-5 words)
2. Provide a brief description explaining what types of conversations belong in this category
3. Explain your reasoning for why this is a common pattern

Focus on:
- Recurring themes across multiple conversations
- Technical issues that appear frequently
- Common customer requests or complaints
- Billing, account, or service-related patterns
- Product feature questions or problems

Avoid:
- Overly specific issues that only apply to one conversation
- Categories that are too broad to be useful
- Duplicate or overlapping categories

Return only the most valuable and distinct common issue categories.
`;

  const userPrompt = `
Analyze these recent customer support conversations to identify common issue patterns:

${conversationSummaries
  .map(
    (conv, i) =>
      `Conversation ${i + 1}:
Subject: ${conv.subject || "No subject"}
First message: ${conv.firstMessage || "No first message"}
Recent message: ${conv.recentMessage || "No recent message"}
Status: ${conv.status}
`,
  )
  .join("\n")}

Based on these conversations, what are the most common issue categories that would help organize similar future conversations?
`;

  const result = await runAIObjectQuery({
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
    mailbox,
    queryType: "chat_completion",
    schema: commonIssuesGenerationSchema,
  });

  return result;
};

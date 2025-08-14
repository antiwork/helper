import { z } from "zod";
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

  const conversationSummaries = conversations
    .slice(0, 50)
    .map((conv) => ({
      subject: conv.subject,
      recentMessage: conv.recentMessageText,
      status: conv.status,
    }))
    .filter((conv) => conv.subject || conv.recentMessage);

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

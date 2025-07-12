import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversations } from "@/db/schema/conversations";
import { conversationMessages } from "@/db/schema/conversationMessages";
import { issueGroups } from "@/db/schema/issueGroups";
import { runAIObjectQuery } from "@/lib/ai";
import { getMailbox, Mailbox } from "@/lib/data/mailbox";
import { assertDefinedOrRaiseNonRetriableError } from "./utils";

const getConversationContent = (conversationData: {
  messages?: {
    role: string;
    cleanedUpText?: string | null;
  }[];
  subject?: string | null;
}): string => {
  if (!conversationData?.messages || conversationData.messages.length === 0) {
    return conversationData.subject || "";
  }

  const userMessages = conversationData.messages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.cleanedUpText || "")
    .filter(Boolean);

  const contentParts = [];
  if (conversationData.subject) {
    contentParts.push(conversationData.subject);
  }
  contentParts.push(...userMessages);

  return contentParts.join(" ");
};

const categorizeWithAI = async (
  conversationContent: string,
  availableIssueGroups: Array<{ id: number; title: string; description: string | null }>,
  mailbox: Mailbox,
) => {
  if (availableIssueGroups.length === 0) {
    return { matchedGroupId: null, reasoning: "No issue groups available for categorization" };
  }

  const result = await runAIObjectQuery({
    mailbox,
    queryType: "categorize_conversation_to_issue_group",
    schema: z.object({
      matchedGroupId: z.number().nullable(),
      reasoning: z.string(),
      confidenceScore: z.number().min(0).max(1).optional(),
    }),
    system: `You are an Intelligent Issue Categorization System that analyzes customer conversations and matches them to the most appropriate issue group.

Your task is to:
1. Analyze the semantic meaning and core problem described in the conversation
2. Match it against available issue groups based on title and description
3. Only assign to an issue group if there's a strong, relevant match
4. Return null if no good match exists (it's better to leave uncategorized than to miscategorize)

Matching criteria:
- The conversation's main problem should align with the issue group's purpose
- Consider both direct and indirect relevance
- Look for problem patterns, not just keyword matching
- Prioritize accuracy over assignment rate

If the conversation is too generic, unclear, or doesn't fit any existing categories well, return null.`,
    messages: [
      {
        role: "user",
        content: `CUSTOMER CONVERSATION: "${conversationContent}"

AVAILABLE ISSUE GROUPS:
${availableIssueGroups
  .map(
    (group) =>
      `ID: ${group.id}
Title: ${group.title}
Description: ${group.description || "No description"}`,
  )
  .join("\n\n")}

TASK:
Analyze this customer conversation and determine which issue group (if any) best matches the customer's problem.

Consider:
- What is the customer's main issue or request?
- Which issue group's title and description most closely aligns with this problem?
- Is there a clear, strong match, or would this be a forced categorization?

Return:
1. "matchedGroupId": The ID of the best matching issue group, or null if no good match
2. "reasoning": Brief explanation of your decision
3. "confidenceScore": Your confidence level (0-1) in this categorization

Remember: It's better to return null than to force a poor match.`,
      },
    ],
    temperature: 0.1, // Low temperature for consistent categorization
    functionId: "categorize-conversation-to-issue-group",
  });

  return result;
};

export const categorizeConversationToIssueGroup = async ({ messageId }: { messageId: number }) => {
  // Get the conversation from the message ID
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
            role: true,
            cleanedUpText: true,
          },
        },
      },
    }),
  );

  // Skip if already assigned to an issue group
  if (conversation.issueGroupId) {
    return { 
      message: "Conversation already assigned to an issue group",
      conversationId: conversation.id,
      currentIssueGroupId: conversation.issueGroupId 
    };
  }

  // Get mailbox info
  const mailbox = assertDefinedOrRaiseNonRetriableError(await getMailbox());

  // Get all available issue groups for this mailbox
  const availableIssueGroups = await db
    .select({
      id: issueGroups.id,
      title: issueGroups.title,
      description: issueGroups.description,
    })
    .from(issueGroups)
    .where(eq(issueGroups.mailboxId, conversation.unused_mailboxId));

  if (availableIssueGroups.length === 0) {
    return {
      message: "No issue groups available for categorization",
      conversationId: conversation.id,
    };
  }

  // Extract conversation content
  const conversationContent = getConversationContent(conversation);
  
  if (!conversationContent.trim()) {
    return {
      message: "Skipped: conversation has no content to analyze",
      conversationId: conversation.id,
    };
  }

  // Use AI to categorize
  const aiResult = await categorizeWithAI(conversationContent, availableIssueGroups, mailbox);

  // If AI found a good match, assign it
  if (aiResult.matchedGroupId) {
    await db
      .update(conversations)
      .set({ issueGroupId: aiResult.matchedGroupId })
      .where(eq(conversations.id, conversation.id));

    const matchedGroup = availableIssueGroups.find((group) => group.id === aiResult.matchedGroupId);

    return {
      message: `Conversation ${conversation.id} categorized to issue group: ${matchedGroup?.title}`,
      conversationId: conversation.id,
      assignedIssueGroupId: aiResult.matchedGroupId,
      issueGroupTitle: matchedGroup?.title,
      aiReasoning: aiResult.reasoning,
      confidenceScore: aiResult.confidenceScore,
    };
  }

  // No good match found
  return {
    message: "No suitable issue group found for this conversation",
    conversationId: conversation.id,
    aiReasoning: aiResult.reasoning,
    confidenceScore: aiResult.confidenceScore,
    availableGroupsCount: availableIssueGroups.length,
  };
};
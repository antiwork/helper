import { CoreMessage } from "ai";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages, conversations, ToolMetadata } from "@/db/schema";
import { runAIObjectQuery } from "@/lib/ai";
import { HELPER_TO_AI_ROLES_MAPPING } from "@/lib/ai/constants";
import { cleanUpTextForAI, MINI_MODEL } from "@/lib/ai/core";
import { findOriginalAndMergedMessages } from "@/lib/data/conversationMessage";
import { getMailbox } from "@/lib/data/mailbox";

const constructMessagesForConversationSummary = (
  emails: Pick<typeof conversationMessages.$inferSelect, "role" | "cleanedUpText" | "metadata">[],
): CoreMessage[] => {
  const allEmailsContent = emails
    .map((email) => {
      if (email.role === "tool") {
        const metadata = email.metadata as ToolMetadata | null;
        return `Tool called: ${metadata?.tool?.name || "Unknown"}\nResult: ${JSON.stringify(metadata?.result)}`;
      }
      return `From: ${HELPER_TO_AI_ROLES_MAPPING[email.role]}\nContent: ${cleanUpTextForAI(email.cleanedUpText ?? "")}`;
    })
    .join("\n\n");

  return [{ role: "user", content: allEmailsContent }];
};

const summarySchema = z.object({
  summary: z.array(z.string()),
});

export const generateConversationSummary = async (
  conversation: typeof conversations.$inferSelect,
  { force }: { force?: boolean } = {},
) => {
  const mailbox = await getMailbox();
  if (!mailbox) throw new Error("Mailbox not found");

  const emails = await findOriginalAndMergedMessages(conversation.id, (condition) =>
    db.query.conversationMessages.findMany({
      where: and(condition, isNull(conversationMessages.deletedAt), eq(conversationMessages.status, "sent")),
      orderBy: asc(conversationMessages.createdAt),
      columns: {
        role: true,
        cleanedUpText: true,
        metadata: true,
      },
    }),
  );

  if (emails.length <= 2 && !force) return false;

  const prompt = [
    'The goal is to summarize all the messages in the conversation in bullet points and output in JSON format with key "summary" and value should be list of points.',
    "Make sure to generate only JSON output. The output JSON should be in the format specified.",
    "PRIORITIZE extracting concrete, actionable details that can be copy/pasted into Admin tools:",
    "- Product names, SKUs, or service names mentioned",
    "- Credit card information (last 4 digits, card type, billing issues)",
    "- Receipt URLs, transaction IDs, order numbers, or purchase references",
    "- Account details, email addresses, or customer identifiers",
    "- Specific dollar amounts, refund amounts, or pricing mentioned",
    "- Dates of purchases, subscriptions, or important events",
    "If a tool returned highly relevant results with concrete details (purchase info, payment data, account details), include ALL specific information from the tool result as separate bullet points.",
    "Focus on actionable information over general conversation flow - what specific details would a support agent need to help this customer?",
    "Create the summary in English only, regardless of the original conversation language.",
    "Start with the most specific and concrete details first, not generic descriptions.",
  ].join("\n");

  const messages = constructMessagesForConversationSummary(emails);

  const { summary } = await runAIObjectQuery({
    model: MINI_MODEL,
    mailbox,
    queryType: "conversation_summary",
    functionId: "generate-conversation-summary",
    system: prompt,
    messages,
    schema: summarySchema,
    shortenPromptBy: {
      truncateMessages: true,
    },
  });

  await db.update(conversations).set({ summary }).where(eq(conversations.id, conversation.id));

  return true;
};

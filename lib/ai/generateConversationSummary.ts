import { CoreMessage } from "ai";
import { and, asc, eq, inArray, isNull, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/inngest/utils";
import { runAIObjectQuery } from "@/lib/ai";
import { HELPER_TO_AI_ROLES_MAPPING } from "@/lib/ai/constants";
import { cleanUpTextForAI } from "@/lib/ai/core";

const constructAnthropicMessagesForConversationSummary = (
  emails: { role: (typeof conversationMessages.$inferSelect)["role"]; cleanedUpText: string | null }[],
): CoreMessage[] => {
  const allEmailsContent = emails
    .map(
      (email) =>
        `From: ${HELPER_TO_AI_ROLES_MAPPING[email.role]}\nContent: ${cleanUpTextForAI(email.cleanedUpText ?? "")}`,
    )
    .join("\n\n");

  return [{ role: "user", content: allEmailsContent }];
};

const summarySchema = z.object({
  summary: z.array(z.string()),
});

export const generateConversationSummary = async (conversationId: number, { force }: { force?: boolean } = {}) => {
  const conversation = assertDefinedOrRaiseNonRetriableError(
    await db.query.conversations.findFirst({
      where: eq(conversations.id, conversationId),
      with: { mailbox: true },
    }),
  );

  const emails = await db.query.conversationMessages.findMany({
    where: and(
      eq(conversationMessages.conversationId, conversation.id),
      isNull(conversationMessages.deletedAt),
      inArray(conversationMessages.role, ["user", "staff", "ai_assistant"]),
      eq(conversationMessages.status, "sent"),
    ),
    orderBy: asc(conversationMessages.createdAt),
    columns: {
      role: true,
      cleanedUpText: true,
    },
  });

  if (emails.length <= 2 && !force) return "No summary needed";

  const prompt = [
    'The goal is to summarize all the messages in the conversation in bullet points and output in JSON format with key "summary" and value should be list of points.',
    "Make sure to generate only JSON output. The output JSON should be in the format specified.",
    "Provide a concise summary of the main points discussed in the all the conversations in less than 5 sentences.",
    "Do not explicitly mention sensitive or identifying information such as names, passwords, or personal details.",
    "Focus on the key issues, questions, and resolutions discussed in the conversation.",
    "Create the summary in English only, regardless of the original conversation language.",
    "Avoid starting with generic descriptions like 'The conversation involves a discussion about a technical issue with a software application.' Instead, start with the most specific and relevant point from the conversation.",
  ].join("\n");

  const messages = constructAnthropicMessagesForConversationSummary(emails);

  const { summary } = await runAIObjectQuery({
    mailbox: conversation.mailbox,
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

  return "Summary generated";
};

import { CoreMessage } from "ai";
import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { conversationMessages, conversations, issueTopics, mailboxes, ToolMetadata } from "@/db/schema";
import { assertDefinedOrRaiseNonRetriableError } from "@/jobs/utils";
import { generateEmbedding, runAIObjectQuery } from "@/lib/ai";
import { HELPER_TO_AI_ROLES_MAPPING } from "@/lib/ai/constants";
import { cleanUpTextForAI } from "@/lib/ai/core";
import { findOriginalAndMergedMessages } from "@/lib/data/conversationMessage";

const constructMessagesForIssueTopic = (
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

const issueTopicSchema = z.object({
  issueTopic: z
    .string()
    .describe("A short, concise topic for the conversation that can be used to group similar conversations."),
});

export const generateIssueTopic = async (
  conversation: typeof conversations.$inferSelect,
  { force }: { force?: boolean } = {},
) => {
  const mailbox = assertDefinedOrRaiseNonRetriableError(
    await db.query.mailboxes.findFirst({ where: eq(mailboxes.id, conversation.mailboxId) }),
  );

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

  if (emails.length === 0 && !force) return false;

  const prompt = [
    'The goal is to generate a short, concise topic for the conversation that can be used to group similar conversations and output in JSON format with key "issueTopic" and value should be the topic string.',
    "Make sure to generate only JSON output. The output JSON should be in the format specified.",
    "The topic should be a short phrase, ideally 3-5 words, that captures the main reason for the conversation.",
    "For example: 'Password reset request', 'Billing inquiry for invoice #123', 'Feature request for dark mode'.",
    "Focus on the core issue, not the conversational fluff.",
    "Create the topic in English only, regardless of the original conversation language.",
  ].join("\n");

  const messages = constructMessagesForIssueTopic(emails);

  const { issueTopic: newIssueTopic } = await runAIObjectQuery({
    mailbox,
    queryType: "issue_topic_generation",
    functionId: "generate-issue-topic",
    system: prompt,
    messages,
    schema: issueTopicSchema,
    shortenPromptBy: {
      truncateMessages: true,
    },
  });

  let topic = await db.query.issueTopics.findFirst({
    where: eq(issueTopics.summary, newIssueTopic),
  });

  if (!topic) {
    const embedding = await generateEmbedding(newIssueTopic);
    const newTopics = await db.insert(issueTopics).values({ summary: newIssueTopic, embedding }).returning();
    topic = newTopics[0];
  }

  if (!topic) {
    // This should not happen, but as a safeguard
    return false;
  }

  await db.update(conversations).set({ issueTopicId: topic.id }).where(eq(conversations.id, conversation.id));

  return true;
};

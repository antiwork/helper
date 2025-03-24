import { CoreMessage } from "ai";
import { conversationMessages, conversations, mailboxes } from "@/db/schema";
import { ensureCleanedUpText, getPastMessages, getTextWithConversationSubject } from "@/lib/data/conversationMessage";
import { getResponseGeneratorPromptText } from "@/lib/data/mailbox";
import { runAIQuery } from ".";
import { buildMessagesFromHistory } from "./messageBuilder";

export const generateResponseWithPrompt = async ({
  message,
  mailbox,
  metadata,
  appendPrompt,
}: {
  message: typeof conversationMessages.$inferSelect & { conversation: typeof conversations.$inferSelect };
  mailbox: typeof mailboxes.$inferSelect;
  metadata: object | null;
  appendPrompt: string;
}): Promise<string> => {
  await ensureCleanedUpText(message);

  const pastEmails = await getPastMessages(message);

  let prompt = getResponseGeneratorPromptText(mailbox.responseGeneratorPrompt || []);
  prompt += `\n\n${appendPrompt}`;
  prompt += metadata ? `\n\nMetadata:\n${JSON.stringify(metadata)}` : "";

  const messageWithSubject = await getTextWithConversationSubject(message.conversation, message);
  const messages = constructOpenAIMessages(messageWithSubject, pastEmails);

  const response = await runAIQuery({
    mailbox,
    queryType: "response_generator",
    messages,
    system: prompt,
    functionId: "generate-response-with-prompt",
  });

  return response;
};

/**
 * Alternate between "user" and "assistant" roles
 * Ref: https://platform.openai.com/docs/api-reference/chat
 * Also: All messages must have non-empty content
 */
function constructOpenAIMessages(
  prompt: string,
  pastMessages: (typeof conversationMessages.$inferSelect)[],
): CoreMessage[] {
  const messages: CoreMessage[] = [];

  if (pastMessages.length > 0 && pastMessages[0]?.role !== "user") {
    messages.push({ role: "user", content: "Start" });
  }

  messages.push(...buildMessagesFromHistory(pastMessages));
  messages.push({ role: "user", content: prompt });

  return messages;
}

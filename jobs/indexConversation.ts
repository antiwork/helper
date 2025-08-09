import { eq } from "drizzle-orm/expressions";
import { db } from "@/db/client";
import { conversationMessages } from "@/db/schema/conversationMessages";
import { NonRetriableError } from "@/jobs/utils";
import { getConversationById } from "@/lib/data/conversation";
import { ensureCleanedUpText, getConversationMessageById } from "@/lib/data/conversationMessage";
import { extractHashedWordsFromEmail } from "@/lib/emailSearchService/extractHashedWordsFromEmail";

const MAX_LENGTH = 5000;

export const indexConversationMessage = async ({ messageId }: { messageId: number }) => {
  const message = await getConversationMessageById(messageId);
  if (!message) {
    throw new NonRetriableError("Message not found");
  }

  const conversation = await getConversationById(message.conversationId);
  if (!conversation) {
    throw new NonRetriableError("Conversation not found");
  }

  const messageBody = await ensureCleanedUpText(message);

  // Collect words from subject and body
  const uniqueHashedWords = await extractHashedWordsFromEmail({
    emailFrom: conversation.emailFrom,
    subject: conversation.subject,
    body: messageBody,
  });

  // Generate the search index
  let totalLength = 0;
  const searchIndexWords = [];

  for (const word of uniqueHashedWords) {
    // +1 accounts for the space between words
    if (totalLength + word.length + 1 > MAX_LENGTH) {
      break;
    }
    searchIndexWords.push(word);
    totalLength += word.length + 1;
  }

  const searchIndex = searchIndexWords.join(" ");

  await db.update(conversationMessages).set({ searchIndex }).where(eq(conversationMessages.id, message.id));
};

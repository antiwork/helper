import { waitUntil } from "@vercel/functions";
import { type Message } from "ai";
import { eq } from "drizzle-orm";
import { authenticateWidget, corsOptions, corsResponse } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { createUserMessage, respondWithAI } from "@/lib/ai/chat";
import {
  CHAT_CONVERSATION_SUBJECT,
  generateConversationSubject,
  getConversationBySlugAndMailbox,
} from "@/lib/data/conversation";
import { type Mailbox } from "@/lib/data/mailbox";
import { WidgetSessionPayload } from "@/lib/widgetSession";
import { ReadPageToolConfig } from "@/sdk/types";

export const maxDuration = 60;

interface ChatRequestBody {
  message: Message;
  token: string;
  conversationSlug: string;
  readPageTool: ReadPageToolConfig | null;
}

const getConversation = async (conversationSlug: string, session: WidgetSessionPayload, mailbox: Mailbox) => {
  const conversation = await getConversationBySlugAndMailbox(conversationSlug, mailbox.id);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // For anonymous sessions, only allow access if the conversation has no emailFrom
  // For authenticated sessions, only allow access if the emailFrom matches
  if (session.isAnonymous) {
    if (conversation.emailFrom !== null) {
      throw new Error("Unauthorized");
    }
  } else if (session.email && conversation.emailFrom !== session.email) {
    throw new Error("Unauthorized");
  }

  return conversation;
};

export function OPTIONS() {
  return corsOptions();
}

export async function POST(request: Request) {
  const { message, conversationSlug, readPageTool }: ChatRequestBody = await request.json();

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const { session, mailbox } = authResult;
  const conversation = await getConversation(conversationSlug, session, mailbox);

  const userEmail = session.isAnonymous ? null : session.email || null;
  const userMessage = await createUserMessage(conversation.id, userEmail, message.content);

  const { response, messages, isPromptConversation, isFirstMessage } = await respondWithAI({
    conversation,
    mailbox,
    userEmail,
    message,
    messageId: userMessage.id,
    readPageTool,
    onRequestHumanSupport: (messages) => {
      waitUntil(generateConversationSubject(conversation.id, messages, mailbox));
    },
  });

  if (
    (!isPromptConversation && conversation.subject === CHAT_CONVERSATION_SUBJECT) ||
    (isPromptConversation && !isFirstMessage && conversation.subject === messages[0]?.content)
  ) {
    waitUntil(generateConversationSubject(conversation.id, messages, mailbox));
  } else if (isPromptConversation && conversation.subject === CHAT_CONVERSATION_SUBJECT) {
    waitUntil(db.update(conversations).set({ subject: message.content }).where(eq(conversations.id, conversation.id)));
  }

  return response;
}

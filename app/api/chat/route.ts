import { waitUntil } from "@vercel/functions";
import { type Message } from "ai";
import { eq } from "drizzle-orm";
import { ReadPageToolConfig } from "@helperai/sdk";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { createUserMessage, respondWithAI } from "@/lib/ai/chat";
import {
  CHAT_CONVERSATION_SUBJECT,
  generateConversationSubject,
  getConversationBySlugAndMailbox,
} from "@/lib/data/conversation";
import { createClient } from "@/lib/supabase/server";
import { WidgetSessionPayload } from "@/lib/widgetSession";

export const maxDuration = 60;

interface ChatRequestBody {
  message: Message;
  token: string;
  conversationSlug: string;
  readPageTool: ReadPageToolConfig | null;
  guideEnabled: boolean;
  isToolResult?: boolean;
}

const getConversation = async (conversationSlug: string, session: WidgetSessionPayload) => {
  const conversation = await getConversationBySlugAndMailbox(conversationSlug);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  // For anonymous sessions, only allow access if the conversation has no emailFrom
  // For authenticated sessions, only allow access if the emailFrom matches
  const isAnonymousUnauthorized = session.isAnonymous && conversation.emailFrom !== null;
  const isAuthenticatedUnauthorized = session.email && conversation.emailFrom !== session.email;

  if (isAnonymousUnauthorized || isAuthenticatedUnauthorized) {
    throw new Error("Unauthorized");
  }

  return conversation;
};

export function OPTIONS() {
  return corsOptions();
}

export const POST = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const { message, conversationSlug, readPageTool, guideEnabled }: ChatRequestBody = await request.json();

  const conversation = await getConversation(conversationSlug, session);

  const userEmail = session.isAnonymous ? null : session.email || null;
  const attachments = message.experimental_attachments ?? [];

  // Validate attachments
  for (const attachment of attachments) {
    if (!attachment.url.startsWith("data:image/") || !attachment.url.includes(",")) {
      return corsResponse({ error: "Only valid image data URLs are supported" }, { status: 400 });
    }
  }

  // Convert attachments to the format expected by createUserMessage
  const attachmentData = attachments.map((attachment) => {
    const [, base64Data] = attachment.url.split(",");
    if (!base64Data) {
      throw new Error("Invalid data URL format - missing base64 data");
    }
    return {
      name: attachment.name || "unknown.png",
      contentType: attachment.contentType || "image/png",
      data: base64Data,
    };
  });

  const userMessage = await createUserMessage(
    conversation.id,
    userEmail,
    message.content || (attachmentData.length > 0 ? "[Image]" : ""),
    attachmentData.length > 0 ? attachmentData : undefined,
  );

  const supabase = await createClient();
  let isHelperUser = false;
  if ((await supabase.auth.getUser()).data.user?.id) {
    isHelperUser = true;
  }

  return await respondWithAI({
    conversation,
    mailbox,
    userEmail,
    message,
    messageId: userMessage.id,
    readPageTool,
    guideEnabled,
    sendEmail: false,
    reasoningEnabled: false,
    isHelperUser,
    onResponse: ({ messages, isPromptConversation, isFirstMessage, humanSupportRequested }) => {
      if (
        (!isPromptConversation && conversation.subject === CHAT_CONVERSATION_SUBJECT) ||
        (isPromptConversation && !isFirstMessage && conversation.subject === messages[0]?.content) ||
        humanSupportRequested
      ) {
        waitUntil(generateConversationSubject(conversation.id, messages, mailbox));
      } else if (isPromptConversation && conversation.subject === CHAT_CONVERSATION_SUBJECT) {
        waitUntil(
          db.update(conversations).set({ subject: message.content }).where(eq(conversations.id, conversation.id)),
        );
      }
    },
  });
});

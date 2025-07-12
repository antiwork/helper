import { waitUntil } from "@vercel/functions";
import { type Message } from "ai";
import { eq } from "drizzle-orm";
import { ReadPageToolConfig } from "@helperai/sdk";
import { getConversation } from "@/app/api/chat/getConversation";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { createUserMessage, respondWithAI } from "@/lib/ai/chat";
import { CHAT_CONVERSATION_SUBJECT, generateConversationSubject } from "@/lib/data/conversation";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

interface ChatRequestBody {
  message: Message;
  token: string;
  conversationSlug: string;
  readPageTool: ReadPageToolConfig | null;
  guideEnabled: boolean;
  isToolResult?: boolean;
}

export function OPTIONS() {
  return corsOptions();
}

export const POST = withWidgetAuth(async ({ request }, { session, mailbox }) => {
  const { message, conversationSlug, readPageTool, guideEnabled }: ChatRequestBody = await request.json();

  const conversation = await getConversation(conversationSlug, session);

  const userEmail = session.isAnonymous ? null : session.email || null;
  const screenshotData = message.experimental_attachments?.[0]?.url;

  if (
    (message.experimental_attachments ?? []).length > 1 ||
    (screenshotData && !screenshotData.startsWith("data:image/png;base64,"))
  ) {
    return corsResponse(
      { error: "Only a single PNG image attachment sent via data URL is supported" },
      { status: 400 },
    );
  }

  const userMessage = await createUserMessage(
    conversation.id,
    userEmail,
    message.content,
    screenshotData?.replace("data:image/png;base64,", ""),
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

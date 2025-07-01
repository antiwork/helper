import { waitUntil } from "@vercel/functions";
import { type Message } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ReadPageToolConfig } from "@helperai/sdk";
import { createApiHandler } from "@/app/api/route-handler";
import { corsOptions, corsResponse } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversations } from "@/db/schema";
import { createUserMessage, respondWithAI } from "@/lib/ai/chat";
import {
  CHAT_CONVERSATION_SUBJECT,
  generateConversationSubject,
  getConversationBySlugAndMailbox,
} from "@/lib/data/conversation";
import { type Mailbox } from "@/lib/data/mailbox";
import { createClient } from "@/lib/supabase/server";
import { WidgetSessionPayload } from "@/lib/widgetSession";

export const maxDuration = 60;

const chatRequestBodySchema = z.object({
  message: z.any(),
  token: z.string(),
  conversationSlug: z.string(),
  readPageTool: z.any().nullable(),
  guideEnabled: z.boolean(),
  isToolResult: z.boolean().optional(),
});

const getConversation = async (conversationSlug: string, session: WidgetSessionPayload, mailbox: Mailbox) => {
  const conversation = await getConversationBySlugAndMailbox(conversationSlug, mailbox.id);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

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

async function handler(
  request: Request,
  context: { params?: Record<string, string>; mailbox: Mailbox; session: WidgetSessionPayload },
  validatedBody: z.infer<typeof chatRequestBodySchema>,
) {
  const { message, conversationSlug, readPageTool, guideEnabled, isToolResult } = validatedBody;
  const { session, mailbox } = context;

  const conversation = await getConversation(conversationSlug, session, mailbox);

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
}

export const POST = createApiHandler(handler, {
  requiresAuth: true,
  requestSchema: chatRequestBodySchema,
});

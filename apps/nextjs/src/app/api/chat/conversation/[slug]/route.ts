import { and, asc, eq } from "drizzle-orm";
import { cache } from "react";
import { authenticateWidget } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversationMessages, conversations } from "@/db/schema";
import { conversationEvents } from "@/db/schema/conversationEvents";
import { loadScreenshotAttachments } from "@/lib/ai/chat";
import { getClerkUser } from "@/lib/data/user";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return Response.json({ error: authResult.error }, { status: 401 });
  }

  if (!authResult.session.email) {
    return Response.json({ error: "Email is required" }, { status: 401 });
  }

  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.slug, slug), eq(conversations.emailFrom, authResult.session.email)),
    with: {
      messages: {
        orderBy: [asc(conversationMessages.createdAt)],
      },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  const attachments = await loadScreenshotAttachments(conversation.messages);

  const requestHumanSupportEvent = await db.query.conversationEvents.findFirst({
    where: and(
      eq(conversationEvents.conversationId, conversation.id),
      eq(conversationEvents.type, "request_human_support"),
    ),
  });

  const isEscalated = !!requestHumanSupportEvent;

  const formattedMessages = await Promise.all(
    conversation.messages.map(async (message) => ({
      id: message.id.toString(),
      role: message.role === "staff" || message.role === "ai_assistant" ? "assistant" : message.role,
      content: message.cleanedUpText || message.body,
      createdAt: message.createdAt.toISOString(),
      reactionType: message.reactionType,
      reactionFeedback: message.reactionFeedback,
      annotations: message.clerkUserId ? await getUserAnnotation(message.clerkUserId) : undefined,
      experimental_attachments: attachments.filter((a) => a.messageId === message.id),
    })),
  );

  return Response.json({ messages: formattedMessages, isEscalated });
}

const getUserAnnotation = cache(async (userId: string) => {
  const user = await getClerkUser(userId);
  return user ? [{ user: { firstName: user.firstName } }] : undefined;
});

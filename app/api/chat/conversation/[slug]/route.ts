import { and, asc, eq, inArray } from "drizzle-orm";
import { ConversationDetails, updateConversationBodySchema, UpdateConversationResult } from "@helperai/client";
import { getCustomerFilter } from "@/app/api/chat/customerFilter";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversationMessages, conversations, files } from "@/db/schema";
import { updateConversation } from "@/lib/data/conversation";
import { serializeMessageForWidget } from "@/lib/data/conversationMessage";

export const OPTIONS = () => corsOptions("GET", "PATCH");

export const GET = withWidgetAuth<{ slug: string }>(async ({ context: { params }, request }, { session }) => {
  const { slug } = await params;
  const url = new URL(request.url);
  const markRead = url.searchParams.get("markRead") !== "false";

  const customerFilter = getCustomerFilter(session);
  if (!customerFilter) return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });

  const conversation = await db.query.conversations.findFirst({
    where: and(eq(conversations.slug, slug), customerFilter),
    with: {
      messages: {
        where: inArray(conversationMessages.role, ["user", "ai_assistant", "staff"]),
        orderBy: [asc(conversationMessages.createdAt)],
      },
    },
  });

  if (!conversation) {
    return Response.json({ error: "Conversation not found" }, { status: 404 });
  }

  if (markRead) {
    await updateConversation(conversation.id, { set: { lastReadAt: new Date() } });
  }

  const originalConversation =
    (conversation?.mergedIntoId &&
      (await db.query.conversations.findFirst({
        where: eq(conversations.id, conversation.mergedIntoId),
      }))) ||
    conversation;

  const attachments = await db.query.files.findMany({
    where: and(
      inArray(
        files.messageId,
        conversation.messages.map((m) => m.id),
      ),
      eq(files.isInline, false),
    ),
  });

  const incompleteGuideSessions = await db.query.guideSessions.findMany({
    where: (gs) => and(eq(gs.conversationId, conversation.id)),
    with: { events: true },
  });

  const activeGuideSessions = incompleteGuideSessions.filter(
    (session) => !session.events.some((event) => event.type === "completed"),
  );

  const formattedMessages = await Promise.all(
    conversation.messages.map((message) => serializeMessageForWidget(message, attachments)),
  );

  return corsResponse<ConversationDetails>({
    slug: conversation.slug,
    subject: conversation.subject,
    messages: formattedMessages,
    experimental_guideSessions: activeGuideSessions.map((session) => ({
      uuid: session.uuid,
      title: session.title,
      instructions: session.instructions,
      createdAt: session.createdAt.toISOString(),
    })),
    isEscalated: !originalConversation.assignedToAI,
  });
});

export const PATCH = withWidgetAuth<{ slug: string }>(async ({ context: { params }, request }, { session }) => {
  const { slug } = await params;

  const { error } = updateConversationBodySchema.safeParse(await request.json());
  if (error) {
    return corsResponse({ error: "markRead parameter is required" }, { status: 400 });
  }

  const customerFilter = getCustomerFilter(session);
  if (!customerFilter) return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });

  const conversation = await db.query.conversations.findFirst({
    columns: { id: true },
    where: and(eq(conversations.slug, slug), customerFilter),
  });

  if (!conversation) {
    return corsResponse({ error: "Conversation not found" }, { status: 404 });
  }

  await updateConversation(conversation.id, { set: { lastReadAt: new Date() } });

  return corsResponse<UpdateConversationResult>({ success: true });
});

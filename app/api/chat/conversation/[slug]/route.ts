import { and, asc, eq, inArray } from "drizzle-orm";
import { htmlToText } from "html-to-text";
import { corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { db } from "@/db/client";
import { conversationMessages, conversations, files, MessageMetadata } from "@/db/schema";
import { getFirstName } from "@/lib/auth/authUtils";
import { updateConversation } from "@/lib/data/conversation";
import { formatAttachments } from "@/lib/data/files";
import { getBasicProfileById } from "@/lib/data/user";
import { ConversationDetails, updateConversationParamsSchema, UpdateConversationResult } from "@/packages/client/dist";

export const GET = withWidgetAuth<{ slug: string }>(async ({ context: { params }, request }, { session }) => {
  const { slug } = await params;
  const url = new URL(request.url);
  const markRead = url.searchParams.get("markRead") !== "false";

  const whereCondition = conversationMatcher(slug, session);
  if (!whereCondition) return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });

  const conversation = await db.query.conversations.findFirst({
    where: whereCondition,
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
    conversation.messages.map(async (message) => {
      const messageAttachments = await formatAttachments(attachments.filter((a) => a.messageId === message.id));
      const hasPublicAttachments =
        (message.metadata as MessageMetadata)?.hasAttachments ||
        (message.metadata as MessageMetadata)?.includesScreenshot;
      return {
        id: message.id.toString(),
        role: message.role === "ai_assistant" || message.role === "tool" ? ("assistant" as const) : message.role,
        content: message.cleanedUpText || htmlToText(message.body ?? "", { wordwrap: false }),
        createdAt: message.createdAt.toISOString(),
        reactionType: message.reactionType,
        reactionFeedback: message.reactionFeedback,
        reactionCreatedAt: message.reactionCreatedAt?.toISOString() ?? null,
        staffName: await getStaffName(message.userId),
        publicAttachments: hasPublicAttachments ? messageAttachments : [],
        privateAttachments: hasPublicAttachments ? [] : messageAttachments,
      };
    }),
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

  const { error } = updateConversationParamsSchema.safeParse(await request.json());
  if (error) {
    return corsResponse({ error: "markRead parameter is required" }, { status: 400 });
  }

  const whereCondition = conversationMatcher(slug, session);
  if (!whereCondition) return Response.json({ error: "Not authorized - Invalid session" }, { status: 401 });

  const conversation = await db.query.conversations.findFirst({ columns: { id: true }, where: whereCondition });

  if (!conversation) {
    return corsResponse({ error: "Conversation not found" }, { status: 404 });
  }

  await updateConversation(conversation.id, { set: { lastReadAt: new Date() } });

  return corsResponse<UpdateConversationResult>({ success: true });
});

const getStaffName = async (userId: string | null) => {
  if (!userId) return null;
  const user = await getBasicProfileById(userId);
  return user ? getFirstName(user) : null;
};

const conversationMatcher = (slug: string, session: any) => {
  let baseCondition;
  if (session.isAnonymous && session.anonymousSessionId) {
    baseCondition = eq(conversations.anonymousSessionId, session.anonymousSessionId);
  } else if (session.email) {
    baseCondition = eq(conversations.emailFrom, session.email);
  }
  return baseCondition ? and(eq(conversations.slug, slug), baseCondition) : null;
};

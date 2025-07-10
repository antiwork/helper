import { getConversationBySlugAndMailbox } from "@/lib/data/conversation";
import { WidgetSessionPayload } from "@/lib/widgetSession";

export const getConversation = async (conversationSlug: string, session: WidgetSessionPayload) => {
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

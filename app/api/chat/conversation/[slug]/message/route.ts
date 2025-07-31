import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { createUserMessage } from "@/lib/ai/chat";
import { getConversationBySlugAndMailbox } from "@/lib/data/conversation";
import { validateAttachments } from "@/lib/shared/attachmentValidation";
import { triggerEvent } from "@/jobs/trigger";
import { WidgetSessionPayload } from "@/lib/widgetSession";

export const maxDuration = 60;

interface MessageRequestBody {
  content: string;
  attachments?: Array<{
    name?: string;
    url: string;
    contentType?: string;
  }>;
}

const getConversation = async (conversationSlug: string, session: WidgetSessionPayload) => {
  const conversation = await getConversationBySlugAndMailbox(conversationSlug);

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  const isAnonymousUnauthorized = session.isAnonymous && conversation.emailFrom !== null;
  const isAuthenticatedUnauthorized = session.email && conversation.emailFrom !== session.email;

  if (isAnonymousUnauthorized || isAuthenticatedUnauthorized) {
    throw new Error("Unauthorized");
  }

  return conversation;
};

export const OPTIONS = () => corsOptions("POST");

export const POST = withWidgetAuth<{ slug: string }>(async ({ request, context: { params } }, { session }) => {
  const { slug } = await params;
  const { content, attachments = [] }: MessageRequestBody = await request.json();

  if (!content || content.trim().length === 0) {
    return corsResponse({ error: "Content is required" }, { status: 400 });
  }

  const conversation = await getConversation(slug, session);
  const userEmail = session.isAnonymous ? null : session.email || null;

  const validationResult = validateAttachments(
    attachments.map((att) => ({
      name: att.name || "unknown",
      url: att.url,
      type: att.contentType,
    })),
  );

  if (!validationResult.isValid) {
    return corsResponse({ error: validationResult.errors.join(", ") }, { status: 400 });
  }

  const attachmentData = attachments.map((attachment) => {
    if (!attachment.url) {
      throw new Error(`Attachment ${attachment.name || "unknown"} is missing URL`);
    }

    const [, base64Data] = attachment.url.split(",");
    if (!base64Data) {
      throw new Error(`Attachment ${attachment.name || "unknown"} has invalid URL format`);
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
    content,
    attachmentData,
  );

  await triggerEvent("conversations/auto-response.create", { messageId: userMessage.id });

  return corsResponse({
    messageId: userMessage.id,
    conversationSlug: conversation.slug,
  });
});

import { waitUntil } from "@vercel/functions";
import { createMessageParams } from "@helperai/sdk";
import { getConversation } from "@/app/api/chat/getConversation";
import { corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { triggerEvent } from "@/jobs/trigger";
import { createConversationMessage } from "@/lib/data/conversationMessage";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export function OPTIONS() {
  return corsOptions();
}

export const POST = withWidgetAuth<{ slug: string }>(async ({ request, context }, { session }) => {
  const { slug } = await context.params;
  const body = await request.json();
  const { data: { message } = {}, error } = createMessageParams.safeParse(body);
  if (error) return corsResponse({ error: "Invalid request parameters" }, { status: 400 });

  try {
    const conversation = await getConversation(slug, session);

    const userMessage = await createConversationMessage({
      conversationId: conversation.id,
      emailFrom: session.email,
      body: message,
      role: "user",
      status: "sent",
      isPerfect: false,
      isFlaggedAsBad: false,
    });

    waitUntil(triggerEvent("conversations/auto-response.create", { messageId: userMessage.id }));

    return corsResponse({ success: true });
  } catch (error) {
    captureExceptionAndLog(error);
    return corsResponse({ error: "Failed to send message" }, { status: 500 });
  }
});

import { authenticateWidget, corsOptions, corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { getConversationById } from "@/lib/data/conversation";
import { getGuideSessionByUuid } from "@/lib/data/guide";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";

export function OPTIONS() {
  return corsOptions();
}

export const POST = withWidgetAuth(async ({ request }) => {
  const { sessionId } = await request.json();

  if (!sessionId || typeof sessionId !== "string") {
    return corsResponse({ error: "Missing or invalid sessionId" }, { status: 400 });
  }

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const {
    session: { email },
  } = authResult;

  try {
    const guideSession = await getGuideSessionByUuid(sessionId);

    if (!guideSession) {
      return corsResponse({ error: "Guide session not found" }, { status: 404 });
    }

    if (email !== guideSession.platformCustomer.email) {
      return corsResponse({ error: "Unauthorized" }, { status: 403 });
    }

    const conversation = assertDefined(await getConversationById(assertDefined(guideSession.conversationId)));

    return corsResponse({
      sessionId: guideSession.uuid,
      title: guideSession.title,
      instructions: guideSession.instructions,
      steps: guideSession.steps,
      status: guideSession.status,
      conversationSlug: conversation.slug,
    });
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
    return corsResponse({ error: "Failed to fetch guide session" }, { status: 500 });
  }
});

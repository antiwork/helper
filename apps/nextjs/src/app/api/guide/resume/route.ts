import { authenticateWidget, corsResponse } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { getGuideSessionByUuid } from "@/lib/data/guide";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";

export async function POST(request: Request) {
  const { sessionId } = await request.json();

  if (!sessionId || typeof sessionId !== "string") {
    return corsResponse({ error: "Missing or invalid sessionId" }, { status: 400 });
  }

  const authResult = await authenticateWidget(request);
  if (!authResult.success) {
    return corsResponse({ error: authResult.error }, { status: 401 });
  }

  const {
    mailbox,
    session: { email },
  } = authResult;

  try {
    const guideSession = await getGuideSessionByUuid(sessionId);

    if (!guideSession) {
      return corsResponse({ error: "Guide session not found" }, { status: 404 });
    }

    if (guideSession.mailboxId !== mailbox.id || email !== guideSession.platformCustomer.email) {
      return corsResponse({ error: "Unauthorized" }, { status: 403 });
    }

    const conversationId = assertDefined(guideSession.conversationId);

    return corsResponse({
      sessionId: guideSession.uuid,
      title: guideSession.title,
      instructions: guideSession.instructions,
      steps: guideSession.steps,
      status: guideSession.status,
      conversationId,
    });
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
    return corsResponse({ error: "Failed to fetch guide session" }, { status: 500 });
  }
}

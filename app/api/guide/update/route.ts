import { z } from "zod";
import { corsResponse, withWidgetAuth } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { getGuideSessionByUuid, updateGuideSession, type GuideSession } from "@/lib/data/guide";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const updateGuideSchema = z.object({
  sessionId: z.string().uuid(),
  steps: z.array(
    z.object({
      description: z.string(),
      completed: z.boolean(),
    }),
  ),
});

export const POST = withWidgetAuth(async ({ request }, { session }) => {
  try {
    const body = await request.json();
    const result = updateGuideSchema.safeParse(body);
    if (!result.success) {
      return corsResponse({ error: "Invalid request body" }, { status: 400 });
    }

    const { sessionId, steps } = result.data;

    try {
      const guideSession = await getGuideSessionByUuid(sessionId);

      if (!guideSession) {
        return corsResponse({ error: "Guide session not found" }, { status: 404 });
      }

      if (session.email !== guideSession.platformCustomer.email) {
        return corsResponse({ error: "Unauthorized" }, { status: 403 });
      }

      const updatedSession = await updateGuideSession(guideSession.id, {
        set: { steps: steps as GuideSession["steps"] },
      });

      if (!updatedSession) {
        throw new Error("Failed to update guide session");
      }

      const conversationId = assertDefined(updatedSession.conversationId);

      return corsResponse({
        sessionId: updatedSession.uuid,
        title: updatedSession.title,
        instructions: updatedSession.instructions,
        steps: updatedSession.steps,
        status: updatedSession.status,
        conversationId,
      });
    } catch (error) {
      captureExceptionAndLog(error);
      return corsResponse({ error: "Failed to update guide session" }, { status: 500 });
    }
  } catch (error) {
    captureExceptionAndLog(error);
    return corsResponse({ error: "Failed to update guide session" }, { status: 500 });
  }
});

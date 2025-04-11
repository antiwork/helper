import { eq } from "drizzle-orm";
import { authenticateWidget, corsResponse } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { guideSessionReplays, guideSessions } from "@/db/schema";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";

export async function POST(request: Request) {
  try {
    const authResult = await authenticateWidget(request);
    if (!authResult.success) {
      return corsResponse({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId, events, metadata, isRecording } = body;

    if (!sessionId || !events?.length) {
      return corsResponse({ error: "Missing required parameters" }, { status: 400 });
    }

    const guideSession = assertDefined(
      await db.query.guideSessions.findFirst({
        where: eq(guideSessions.uuid, sessionId),
      }),
    );

    if (isRecording) {
      await Promise.all(
        events.map((event: any) =>
          db.insert(guideSessionReplays).values({
            guideSessionId: guideSession.id,
            type: event.type,
            data: event,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            metadata: metadata || {},
          }),
        ),
      );
    }

    return corsResponse({ success: true, eventsReceived: events.length });
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
    return corsResponse({ error: "Failed to process events" }, { status: 500 });
  }
}

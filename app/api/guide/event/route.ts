import { eq } from "drizzle-orm";
import { z } from "zod";
import { corsOptions, corsResponse, withAuth } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { guideSessionEventTypeEnum, guideSessionReplays, guideSessions } from "@/db/schema";
import { createGuideSessionEvent, updateGuideSession } from "@/lib/data/guide";
import { captureExceptionAndLogIfDevelopment } from "@/lib/shared/sentry";

const eventSchema = z.object({
  type: z.enum(guideSessionEventTypeEnum.enumValues),
  timestamp: z.number().transform((val) => new Date(val)),
  data: z.record(z.string(), z.unknown()),
});

export function OPTIONS() {
  return corsOptions();
}

export const POST = withAuth(async ({ request }, { mailbox }) => {
  try {
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

    if (guideSession.mailboxId !== mailbox.id) {
      return corsResponse({ error: "Unauthorized" }, { status: 401 });
    }

    if (isRecording) {
      await Promise.all(
        events.map((event: any) =>
          db.insert(guideSessionReplays).values({
            guideSessionId: guideSession.id,
            type: event.type,
            data: event,
            mailboxId: guideSession.mailboxId,
            timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
            metadata: metadata || {},
          }),
        ),
      );
    } else {
      await Promise.all(
        events.map(async (event: any) => {
          const eventData = eventSchema.parse(event);

          if (eventData.type === "completed") {
            await updateGuideSession(guideSession.id, {
              set: { status: "completed" },
            });
          }

          return createGuideSessionEvent({
            guideSessionId: guideSession.id,
            type: eventData.type,
            data: eventData.data,
            timestamp: eventData.timestamp,
            mailboxId: guideSession.mailboxId,
          });
        }),
      );
    }

    return corsResponse({ success: true, eventsReceived: events.length });
  } catch (error) {
    captureExceptionAndLogIfDevelopment(error);
    return corsResponse({ error: "Failed to process events" }, { status: 500 });
  }
});

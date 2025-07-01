import { eq } from "drizzle-orm";
import { z } from "zod";
import { createApiHandler } from "@/app/api/route-handler";
import { corsOptions, corsResponse } from "@/app/api/widget/utils";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { guideSessionEventTypeEnum, guideSessionReplays, guideSessions } from "@/db/schema";
import { createGuideSessionEvent, updateGuideSession } from "@/lib/data/guide";

const eventSchema = z.object({
  type: z.enum(guideSessionEventTypeEnum.enumValues),
  timestamp: z.number().transform((val) => new Date(val)),
  data: z.record(z.string(), z.unknown()),
});

const requestSchema = z.object({
  sessionId: z.string().min(1),
  events: z.array(eventSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isRecording: z.boolean().optional(),
});

export function OPTIONS() {
  return corsOptions();
}

export const POST = createApiHandler(
  async (
    request: Request,
    context: { params?: Record<string, string>; mailbox: any; session: any },
    validatedBody: z.infer<typeof requestSchema>,
  ) => {
    const { sessionId, events, metadata, isRecording } = validatedBody;
    const { mailbox } = context;

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
  },
  {
    requiresAuth: true,
    requestSchema,
  },
);

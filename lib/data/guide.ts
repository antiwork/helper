import "server-only";
import { count, eq } from "drizzle-orm";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { db, type Transaction } from "@/db/client";
import { guideSessionEvents, guideSessionEventTypeEnum, guideSessions, platformCustomers } from "@/db/schema";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export type GuideSession = typeof guideSessions.$inferSelect;
export type GuideSessionEvent = typeof guideSessionEvents.$inferSelect;

export type GuideSessionEventData = {
  steps?: string[];
  state_analysis?: string;
  progress_evaluation?: string;
  challenges?: string;
  reasoning?: string;
  [key: string]: unknown;
};

export const createGuideSession = async ({
  platformCustomerId,
  title,
  instructions,
  conversationId,
  mailboxId,
  steps,
}: {
  platformCustomerId: number;
  title: string;
  instructions: string;
  conversationId: string | number;
  mailboxId: number;
  steps: { description: string; completed: boolean }[];
}): Promise<GuideSession> => {
  try {
    const [guideSession] = await db
      .insert(guideSessions)
      .values({
        platformCustomerId,
        title,
        instructions,
        conversationId: typeof conversationId === "string" ? null : conversationId,
        mailboxId,
        status: "planning",
        steps,
      })
      .returning();

    if (!guideSession) {
      throw new Error("Failed to create guide session");
    }

    return guideSession;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to create guide session");
  }
};

export const updateGuideSession = async (
  guideSessionId: number,
  {
    set: dbUpdates = {},
  }: {
    set?: Partial<typeof guideSessions.$inferInsert>;
  },
  tx: Transaction | typeof db = db,
): Promise<GuideSession | null> => {
  try {
    const guideSession = await tx
      .update(guideSessions)
      .set(dbUpdates)
      .where(eq(guideSessions.id, guideSessionId))
      .returning()
      .then(takeUniqueOrThrow);

    return guideSession;
  } catch (error) {
    captureExceptionAndLog(error);
    return null;
  }
};

export const createGuideSessionEvent = async ({
  guideSessionId,
  type,
  data,
  timestamp,
  mailboxId,
}: {
  guideSessionId: number;
  type: (typeof guideSessionEventTypeEnum.enumValues)[number];
  data: GuideSessionEventData;
  timestamp?: Date;
  mailboxId: number;
  metadata?: Record<string, unknown>;
}): Promise<GuideSessionEvent> => {
  try {
    const [event] = await db
      .insert(guideSessionEvents)
      .values({
        guideSessionId,
        type,
        data,
        mailboxId,
        timestamp: timestamp || new Date(),
      })
      .returning();

    if (!event) {
      throw new Error("Failed to create guide session event");
    }

    return event;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to create guide session event");
  }
};

export const getGuideSessionsForMailbox = async (
  mailboxId: number,
  page = 1,
  limit = 10,
): Promise<{ sessions: GuideSession[]; totalCount: number }> => {
  try {
    const offset = (page - 1) * limit;

    const totalResult = await db
      .select({ count: count() })
      .from(guideSessions)
      .where(eq(guideSessions.mailboxId, mailboxId));
    const totalCount = totalResult[0]?.count || 0;

    const sessions = await db.query.guideSessions.findMany({
      where: (gs, { eq }) => eq(gs.mailboxId, mailboxId),
      orderBy: (gs, { desc }) => [desc(gs.createdAt)],
      limit,
      offset,
    });

    return { sessions, totalCount };
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to fetch guide sessions");
  }
};

export const getGuideSessionByUuid = async (
  uuid: string,
): Promise<(GuideSession & { platformCustomer: typeof platformCustomers.$inferSelect }) | null> => {
  try {
    const session = await db.query.guideSessions.findFirst({
      where: (gs, { eq }) => eq(gs.uuid, uuid),
      with: {
        platformCustomer: true,
      },
    });
    return session ?? null;
  } catch (error) {
    captureExceptionAndLog(error);
    return null;
  }
};

export const getGuideSessionActions = async (guideSessionId: number): Promise<GuideSessionEvent[]> => {
  try {
    const events = await db.query.guideSessionEvents.findMany({
      where: (gs, { eq, and }) => and(eq(gs.guideSessionId, guideSessionId), eq(gs.type, "action_performed")),
      orderBy: (gs, { asc }) => [asc(gs.timestamp)],
    });

    return events;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to fetch guide session events");
  }
};

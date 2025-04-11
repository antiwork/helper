import "server-only";
import { db } from "@/db/client";
import {
  guideSessionEvents,
  guideSessionEventTypeEnum,
  guideSessionReplays,
  guideSessions,
  platformCustomers,
} from "@/db/schema";
import { type PlanResult } from "@/lib/ai/guide";
import { captureExceptionAndLog } from "../shared/sentry";

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

export const createGuideSessionEvent = async ({
  guideSessionId,
  type,
  data,
}: {
  guideSessionId: number;
  type: (typeof guideSessionEventTypeEnum.enumValues)[number];
  data: GuideSessionEventData;
}): Promise<GuideSessionEvent> => {
  try {
    const [event] = await db
      .insert(guideSessionEvents)
      .values({
        guideSessionId,
        type,
        data,
        timestamp: new Date(),
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

export const getGuideSessionsForMailbox = async (mailboxId: number): Promise<GuideSession[]> => {
  try {
    const sessions = await db.query.guideSessions.findMany({
      where: (gs, { eq }) => eq(gs.mailboxId, mailboxId),
      orderBy: (gs, { desc }) => [desc(gs.createdAt)],
    });

    return sessions;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to fetch guide sessions");
  }
};

export const getGuideSessionReplays = async (
  sessionId: number,
): Promise<(typeof guideSessionReplays.$inferSelect)[]> => {
  try {
    const replays = await db.query.guideSessionReplays.findMany({
      where: (gsr, { eq }) => eq(gsr.guideSessionId, sessionId),
      orderBy: (gsr, { asc }) => [asc(gsr.timestamp)],
    });

    return replays;
  } catch (error) {
    captureExceptionAndLog(error);
    throw new Error("Failed to fetch guide session replays");
  }
};

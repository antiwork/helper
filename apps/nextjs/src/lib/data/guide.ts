import "server-only";
import { db } from "@/db/client";
import { guideSessionEvents, guideSessionEventTypeEnum, guideSessions } from "@/db/schema";
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
  steps,
}: {
  platformCustomerId: number;
  title: string;
  instructions: string;
  conversationId: string | number;
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

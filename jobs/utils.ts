import { eq, sql } from "drizzle-orm";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

export class NonRetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetriableError";
  }
}

export const assertDefinedOrRaiseNonRetriableError = <T>(value: T | null | undefined): T => {
  try {
    return assertDefined(value);
  } catch (error) {
    captureExceptionAndLog(error);
    throw new NonRetriableError("Value is undefined");
  }
};

export const retryDelaySeconds: Record<number, number> = {
  0: 5,
  1: 60,
  2: 5 * 60,
  3: 60 * 60,
};

export const failJob = async (jobRun: typeof jobRuns.$inferSelect, error: unknown): Promise<boolean> => {
  let retryScheduled = false;
  await db.transaction(async (tx) => {
    const delay = retryDelaySeconds[jobRun.attempts];
    if (!(error instanceof NonRetriableError) && delay) {
      const payload = { job: jobRun.job, data: jobRun.data, event: jobRun.event, jobRunId: jobRun.id };
      await tx.execute(sql`SELECT pgmq.send('jobs', ${payload}::jsonb, ${delay})`);
      retryScheduled = true;
    }
    await tx
      .update(jobRuns)
      .set({
        status: "error",
        error: error instanceof Error ? error.message : `${error}`,
        attempts: jobRun.attempts + 1,
      })
      .where(eq(jobRuns.id, jobRun.id));
  });
  return retryScheduled;
};

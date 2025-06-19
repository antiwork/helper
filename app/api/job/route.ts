import { createHmac, timingSafeEqual } from "crypto";
import { waitUntil } from "@vercel/functions";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema";
import { cronJobs, eventJobs } from "@/jobs";
import { EventData, EventName } from "@/jobs/trigger";
import { env } from "@/lib/env";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const verifyHmac = (body: string, providedHmac: string): boolean => {
  try {
    const expectedHmac = createHmac("sha256", env.ENCRYPT_COLUMN_SECRET).update(body).digest("hex");
    return timingSafeEqual(Buffer.from(providedHmac, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    return false;
  }
};

const retrySeconds: Record<number, number> = {
  0: 5,
  1: 60,
  2: 5 * 60,
  3: 60 * 60,
};

const handleJob = async (jobRun: typeof jobRuns.$inferSelect, handler: Promise<any>) => {
  try {
    const result = await handler;
    await db.update(jobRuns).set({ status: "success", result }).where(eq(jobRuns.id, jobRun.id));
  } catch (error) {
    captureExceptionAndLog(error);
    await db.transaction(async (tx) => {
      if (retrySeconds[jobRun.attempts]) {
        const payload = { job: jobRun.job, data: jobRun.data, event: jobRun.event, jobRunId: jobRun.id };
        await tx.execute(sql`SELECT pgmq.send('jobs', ${payload}::jsonb, ${retrySeconds[jobRun.attempts]})`);
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
  }
};

export const POST = async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const providedHmac = authHeader.slice(7);
    const body = await request.text();

    if (!verifyHmac(body, providedHmac)) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = JSON.parse(body) as
      | { event: EventName; job: string; jobRunId?: number; data: EventData<EventName> }
      | { job: string; jobRunId?: number; event?: undefined; data?: undefined };

    const jobRun = data.jobRunId
      ? assertDefined(await db.query.jobRuns.findFirst({ where: eq(jobRuns.id, data.jobRunId) }))
      : await db
          .insert(jobRuns)
          .values({ job: data.job, event: data.event, data: data.data ?? null })
          .returning()
          .then(takeUniqueOrThrow);

    if (data.event) {
      const jobs = eventJobs[data.event].jobs;
      const handler = jobs[data.job as keyof typeof jobs] as (data: EventData<EventName>) => Promise<any>;
      if (!handler) {
        await db.update(jobRuns).set({ status: "error", error: "Job not found" }).where(eq(jobRuns.id, jobRun.id));
        return new Response("Not found", { status: 404 });
      }
      waitUntil(handleJob(jobRun, handler(data.data)));
    } else {
      const handler = Object.assign({}, ...Object.values(cronJobs))[data.job] as () => Promise<any>;
      if (!handler) {
        await db.update(jobRuns).set({ status: "error", error: "Job not found" }).where(eq(jobRuns.id, jobRun.id));
        return new Response("Not found", { status: 404 });
      }
      waitUntil(handleJob(jobRun, handler()));
    }

    return new Response("OK");
  } catch (error) {
    return new Response("Internal Server Error", { status: 500 });
  }
};

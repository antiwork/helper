import { createHmac, timingSafeEqual } from "crypto";
import * as Sentry from "@sentry/nextjs";
import { waitUntil } from "@vercel/functions";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import superjson from "superjson";
import { takeUniqueOrThrow } from "@/components/utils/arrays";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema";
import { cronJobs, eventJobs } from "@/jobs";
import { EventData, EventName } from "@/jobs/trigger";
import { failJob } from "@/jobs/utils";
import { getSecret, SECRET_NAMES } from "@/lib/secrets";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

const verifyHmac = async (body: string, providedHmac: string, timestamp: string): Promise<boolean> => {
  if (!timestamp) return false;

  // Prevent replay attacks by checking timestamp is recent (within 5 minutes)
  const timestampSeconds = parseInt(timestamp, 10);
  if (isNaN(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60) return false;

  try {
    const hmacSecret = await getSecret(SECRET_NAMES.JOBS_HMAC);
    if (!hmacSecret) {
      return false;
    }

    const expectedHmac = createHmac("sha256", hmacSecret).update(`${timestamp}.${body}`).digest("hex");
    return timingSafeEqual(Buffer.from(providedHmac, "hex"), Buffer.from(expectedHmac, "hex"));
  } catch {
    return false;
  }
};

const handleJob = async (jobRun: typeof jobRuns.$inferSelect, handler: Promise<any>) => {
  try {
    Sentry.setTag("job", jobRun.job);
    Sentry.setExtra("data", jobRun.data);
    // eslint-disable-next-line no-console
    console.log(`Running job ${jobRun.id} (${jobRun.job} ${JSON.stringify(jobRun.data)})`);
    await db.update(jobRuns).set({ status: "running" }).where(eq(jobRuns.id, jobRun.id));
    const result = await handler;
    await db.update(jobRuns).set({ status: "success", result }).where(eq(jobRuns.id, jobRun.id));
    // eslint-disable-next-line no-console
    console.log(`Job ${jobRun.id} (${jobRun.job}) completed with:`, result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log(`Job ${jobRun.id} (${jobRun.job}) failed`);
    captureExceptionAndLog(error);
    await failJob(jobRun, error);
  }
};

export const maxDuration = 60;

export const POST = async (request: NextRequest) => {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    const providedHmac = authHeader.slice(7);
    const body = await request.text();

    if (!(await verifyHmac(body, providedHmac, request.headers.get("x-timestamp") ?? ""))) {
      return new Response("Unauthorized", { status: 401 });
    }

    const data = JSON.parse(body) as
      | { event: EventName; job: string; jobRunId?: number; data: any }
      | { job: string; jobRunId?: number; event?: undefined; data?: undefined };
    const queueMessageId = request.headers.get("X-Queue-Message-Id");

    const jobRun = data.jobRunId
      ? assertDefined(await db.query.jobRuns.findFirst({ where: eq(jobRuns.id, data.jobRunId) }))
      : await db
          .insert(jobRuns)
          .values({
            job: data.job,
            event: data.event,
            data: data.data ?? {},
            queueMessageId: queueMessageId ? parseInt(queueMessageId) : undefined,
          })
          .returning()
          .then(takeUniqueOrThrow);

    if (data.event) {
      const handler = eventJobs[data.job as keyof typeof eventJobs] as (data: EventData<EventName>) => Promise<any>;
      if (!handler) {
        await db.update(jobRuns).set({ status: "error", error: "Job not found" }).where(eq(jobRuns.id, jobRun.id));
        return new Response("Not found", { status: 404 });
      }
      waitUntil(handleJob(jobRun, handler(data.data?.json ? superjson.deserialize(data.data) : data.data)));
    } else {
      const handler = Object.assign({}, ...Object.values(cronJobs))[data.job] as () => Promise<any>;
      if (!handler) {
        await db.update(jobRuns).set({ status: "error", error: "Job not found" }).where(eq(jobRuns.id, jobRun.id));
        return new Response("Not found", { status: 404 });
      }
      waitUntil(handleJob(jobRun, handler()));
    }

    // eslint-disable-next-line no-console
    console.log(`Created job run ${jobRun.id}`);
    return new Response(`OK: Job run ${jobRun.id}`);
  } catch (error) {
    captureExceptionAndLog(error);
    return new Response("Internal Server Error", { status: 500 });
  }
};

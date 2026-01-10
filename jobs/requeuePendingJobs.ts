import { and, eq, isNotNull, lte, sql } from "drizzle-orm";
import { chunk } from "lodash-es";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema";

const BATCH_SIZE = 100;

export const requeuePendingJobs = async () => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const stalePendingJobs = await db.query.jobRuns.findMany({
    where: and(eq(jobRuns.status, "pending"), isNotNull(jobRuns.scheduledAt), lte(jobRuns.scheduledAt, fiveMinutesAgo)),
  });

  const payloads = stalePendingJobs.map((jobRun) => ({
    job: jobRun.job,
    data: jobRun.data,
    event: jobRun.event,
    jobRunId: jobRun.id,
  }));

  for (const batch of chunk(payloads, BATCH_SIZE)) {
    await db.execute(sql`SELECT pgmq.send_batch('jobs', ARRAY[${sql.join(batch, sql`,`)}]::jsonb[])`);
  }

  return { requeuedCount: stalePendingJobs.length };
};

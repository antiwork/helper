import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { jobRuns } from "@/db/schema";
import { failJob } from "./utils";

export const checkStaleJobs = async () => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  const staleJobs = await db.query.jobRuns.findMany({
    where: and(
      eq(jobRuns.status, "running"),
      lte(jobRuns.updatedAt, fiveMinutesAgo),
      gte(jobRuns.updatedAt, tenMinutesAgo),
    ),
  });

  let retriedCount = 0;
  let failedCount = 0;

  for (const jobRun of staleJobs) {
    const retryScheduled = await failJob(jobRun, new Error("Job timed out (stale 'running' status)"));
    if (retryScheduled) {
      retriedCount++;
    } else {
      failedCount++;
    }
  }

  return { staleJobsFound: staleJobs.length, retriedCount, failedCount };
};

import { jobRunFactory } from "@tests/support/factories/jobRuns";
import { subWeeks } from "date-fns";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { cleanupOldJobRuns } from "@/jobs/cleanupOldJobRuns";

describe("cleanupOldJobRuns", () => {
  it("deletes job runs older than two weeks", async () => {
    const threeWeeksAgo = subWeeks(new Date(), 3);
    const twoWeeksAgo = subWeeks(new Date(), 2);

    const { jobRun: oldJobRun1 } = await jobRunFactory.create({ createdAt: threeWeeksAgo });
    const { jobRun: oldJobRun2 } = await jobRunFactory.create({ createdAt: twoWeeksAgo });

    const result = await cleanupOldJobRuns();

    expect(result.deletedCount).toBe(2);
    const remainingJobRuns = await db.query.jobRuns.findMany();
    expect(remainingJobRuns.find((jr) => jr.id === oldJobRun1.id)).toBeUndefined();
    expect(remainingJobRuns.find((jr) => jr.id === oldJobRun2.id)).toBeUndefined();
  });

  it("does not delete job runs newer than two weeks", async () => {
    const oneWeekAgo = subWeeks(new Date(), 1);
    const today = new Date();

    const { jobRun: recentJobRun1 } = await jobRunFactory.create({ createdAt: oneWeekAgo });
    const { jobRun: recentJobRun2 } = await jobRunFactory.create({ createdAt: today });

    const result = await cleanupOldJobRuns();

    expect(result.deletedCount).toBe(0);
    const remainingJobRuns = await db.query.jobRuns.findMany();
    expect(remainingJobRuns.find((jr) => jr.id === recentJobRun1.id)).toBeDefined();
    expect(remainingJobRuns.find((jr) => jr.id === recentJobRun2.id)).toBeDefined();
  });

  it("only deletes old job runs while keeping recent ones", async () => {
    const threeWeeksAgo = subWeeks(new Date(), 3);
    const oneWeekAgo = subWeeks(new Date(), 1);

    const { jobRun: oldJobRun } = await jobRunFactory.create({ createdAt: threeWeeksAgo });
    const { jobRun: recentJobRun } = await jobRunFactory.create({ createdAt: oneWeekAgo });

    const result = await cleanupOldJobRuns();

    expect(result.deletedCount).toBe(1);
    const remainingJobRuns = await db.query.jobRuns.findMany();
    expect(remainingJobRuns.find((jr) => jr.id === oldJobRun.id)).toBeUndefined();
    expect(remainingJobRuns.find((jr) => jr.id === recentJobRun.id)).toBeDefined();
  });

  it("returns zero when there are no job runs to delete", async () => {
    const result = await cleanupOldJobRuns();

    expect(result.deletedCount).toBe(0);
  });
});

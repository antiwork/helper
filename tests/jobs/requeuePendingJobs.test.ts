import { jobRunFactory } from "@tests/support/factories/jobRuns";
import { subMinutes } from "date-fns";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { requeuePendingJobs } from "@/jobs/requeuePendingJobs";

const readPgmqMessages = async () => (await db.execute(sql`SELECT * FROM pgmq.q_jobs ORDER BY msg_id`)).rows;

describe("requeuePendingJobs", () => {
  beforeEach(async () => {
    await db.execute(sql`DELETE FROM pgmq.q_jobs`);
  });

  it("requeues stale pending jobs and sends them to pgmq", async () => {
    const { jobRun: jobRun1 } = await jobRunFactory.create({
      status: "pending",
      scheduledAt: subMinutes(new Date(), 10),
      job: "job1",
      data: { foo: "bar" },
      event: "test/event",
    });
    const { jobRun: jobRun2 } = await jobRunFactory.create({
      status: "pending",
      scheduledAt: subMinutes(new Date(), 6),
      job: "job2",
      data: { baz: "qux" },
      event: "test/event2",
    });

    const result = await requeuePendingJobs();

    expect(result.requeuedCount).toBe(2);
    const messages = await readPgmqMessages();
    expect(messages).toHaveLength(2);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: { job: "job1", data: { foo: "bar" }, event: "test/event", jobRunId: jobRun1.id },
        }),
        expect.objectContaining({
          message: { job: "job2", data: { baz: "qux" }, event: "test/event2", jobRunId: jobRun2.id },
        }),
      ]),
    );
  });

  it("does not requeue jobs scheduled less than 5 minutes ago", async () => {
    await jobRunFactory.create({ status: "pending", scheduledAt: subMinutes(new Date(), 3) });

    const result = await requeuePendingJobs();

    expect(result.requeuedCount).toBe(0);
  });

  it.each(["running", "success", "error"] as const)("does not requeue %s jobs", async (status) => {
    await jobRunFactory.create({ status, scheduledAt: subMinutes(new Date(), 10) });

    const result = await requeuePendingJobs();

    expect(result.requeuedCount).toBe(0);
  });

  it("does not requeue pending jobs without scheduledAt", async () => {
    await jobRunFactory.create({ status: "pending", scheduledAt: null });

    const result = await requeuePendingJobs();

    expect(result.requeuedCount).toBe(0);
  });
});

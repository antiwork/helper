import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db/client";
import { triggerEvent } from "@/jobs/trigger";

const readPgmqMessages = async () => (await db.execute(sql`SELECT * FROM pgmq.q_jobs ORDER BY msg_id`)).rows;

describe("triggerEvent", () => {
  beforeEach(async () => {
    // We don't usually clear pgmq tables between tests
    await db.execute(sql`DELETE FROM pgmq.q_jobs`);
  });

  it("creates job runs for each job associated with the event", async () => {
    await triggerEvent("files/preview.generate", { fileId: 123 });

    const runs = await db.query.jobRuns.findMany();
    expect(runs).toHaveLength(1);
    expect(runs[0]).toMatchObject({
      job: "generateFilePreview",
      event: "files/preview.generate",
      data: { fileId: 123 },
      status: "pending",
    });
  });

  it("creates multiple job runs for events with multiple jobs", async () => {
    await triggerEvent("conversations/message.created", { messageId: 456 });

    const runs = await db.query.jobRuns.findMany();
    expect(runs).toHaveLength(6);
    const jobNames = runs.map((r) => r.job).toSorted();
    expect(jobNames).toEqual([
      "categorizeConversationToIssueGroup",
      "generateConversationSummaryEmbeddings",
      "indexConversationMessage",
      "mergeSimilarConversations",
      "notifyVipMessage",
      "publishNewMessageEvent",
    ]);

    runs.forEach((run) => {
      expect(run).toMatchObject({
        event: "conversations/message.created",
        data: { messageId: 456 },
        status: "pending",
      });
    });
  });

  it("sends messages to pgmq with correct payloads", async () => {
    await triggerEvent("files/preview.generate", { fileId: 123 });

    const messages = await readPgmqMessages();
    expect(messages).toHaveLength(1);
    expect(messages[0]?.message).toMatchObject({
      event: "files/preview.generate",
      job: "generateFilePreview",
      data: { json: { fileId: 123 } },
      jobRunId: expect.any(Number),
    });
  });

  it("sends multiple messages for events with multiple jobs", async () => {
    await triggerEvent("conversations/message.created", { messageId: 456 });

    const messages = await readPgmqMessages();
    expect(messages).toHaveLength(6);
    const jobNames = messages.map((m) => (m.message as { job: string }).job).sort();
    expect(jobNames).toEqual([
      "categorizeConversationToIssueGroup",
      "generateConversationSummaryEmbeddings",
      "indexConversationMessage",
      "mergeSimilarConversations",
      "notifyVipMessage",
      "publishNewMessageEvent",
    ]);
  });

  it("does not create job runs if send_batch fails", async () => {
    const originalTransaction = db.transaction.bind(db);

    vi.spyOn(db, "transaction").mockImplementationOnce((callback) => {
      return originalTransaction((tx) => {
        vi.spyOn(tx, "execute").mockRejectedValueOnce(new Error("send_batch failed"));
        return callback(tx);
      });
    });

    await expect(triggerEvent("files/preview.generate", { fileId: 123 })).rejects.toThrow("send_batch failed");

    const runs = await db.query.jobRuns.findMany();
    expect(runs).toHaveLength(0);
  });
});

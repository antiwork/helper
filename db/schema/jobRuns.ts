import { bigint, index, integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { withTimestamps } from "../lib/with-timestamps";

export const jobRuns = pgTable(
  "job_runs",
  {
    ...withTimestamps,
    id: bigint({ mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    queueMessageId: bigint({ mode: "number" }),
    job: text().notNull(),
    event: text(),
    data: jsonb().notNull(),
    status: text().$type<"pending" | "running" | "success" | "error">().notNull().default("pending"),
    result: jsonb(),
    error: text(),
    attempts: integer().notNull().default(0),
  },
  (table) => [
    index("job_runs_created_at_idx").on(table.createdAt),
    index("job_runs_updated_at_idx").on(table.updatedAt),
    index("job_runs_job_idx").on(table.job),
    index("job_runs_status_idx").on(table.status),
  ],
).enableRLS();

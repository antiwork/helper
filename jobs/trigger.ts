import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { eventJobs } from "@/jobs";

export type EventName = keyof typeof eventJobs;
export type EventData<T extends EventName> = z.infer<(typeof eventJobs)[T]["data"]>;

export const triggerEvent = <T extends EventName>(
  event: T,
  data: EventData<T>,
  { sleepSeconds = 0 }: { sleepSeconds?: number } = {},
) => {
  const payloads = Object.keys(eventJobs[event].jobs).map((job) => ({ event, job, data }));
  return db.execute(sql`pgmq_public.send_batch('jobs', ${payloads}, ${sleepSeconds})`);
};

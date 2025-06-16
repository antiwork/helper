import { sql } from "drizzle-orm";
import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";
import { db } from "@/db/client";
import { eventJobs } from "@/inngest/functions";

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
    throw new NonRetriableError("Value is undefined");
  }
};

type ValidatedJobs<TData extends z.ZodObject<any>, TJobs extends Record<string, any>> = {
  [K in keyof TJobs]: TJobs[K] extends (data: z.infer<TData>) => Promise<any>
    ? TJobs[K]
    : `The function arguments must match the event data type.`;
};

type EventJobEntry<TData extends z.ZodObject<any>, TJobs extends Record<string, any>> = {
  data: TData;
  jobs: ValidatedJobs<TData, TJobs>;
};

export const defineEvent = <TData extends z.ZodObject<any>, TJobs extends Record<string, any>>(
  entry: EventJobEntry<TData, TJobs>,
): EventJobEntry<TData, TJobs> => entry;

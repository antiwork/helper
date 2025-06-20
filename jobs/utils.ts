import { z } from "zod";
import { assertDefined } from "@/components/utils/assert";

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

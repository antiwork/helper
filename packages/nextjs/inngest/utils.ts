import crypto from "crypto";
import { NonRetriableError } from "inngest";
import { assertDefined } from "@/components/utils/assert";
import { env } from "@/env";

export const assertDefinedOrRaiseNonRetriableError = <T>(value: T | null | undefined): T => {
  try {
    return assertDefined(value);
  } catch (error) {
    throw new NonRetriableError("Value is undefined");
  }
};

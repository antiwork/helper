import { assertDefined } from "@/components/utils/assert";
import { captureExceptionAndLog } from "@/lib/shared/sentry";

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
    captureExceptionAndLog(error);
    throw new NonRetriableError("Value is undefined");
  }
};

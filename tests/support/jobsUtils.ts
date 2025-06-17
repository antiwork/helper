import { afterEach, vi } from "vitest";

export const mockTriggerEvent = vi.fn();

vi.mock("@/jobs/utils", () => ({
  triggerEvent: mockTriggerEvent,
  NonRetriableError: class NonRetriableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "NonRetriableError";
    }
  },
  assertDefinedOrRaiseNonRetriableError: vi.fn(),
  defineEvent: vi.fn(),
}));

export const mockJobs = () => {
  afterEach(() => {
    mockTriggerEvent.mockClear();
  });

  return { triggerEvent: mockTriggerEvent };
};

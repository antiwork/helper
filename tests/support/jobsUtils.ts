import { afterEach, vi } from "vitest";

export const mockTriggerEvent = vi.fn();

vi.mock("@/jobs/trigger", () => ({
  triggerEvent: mockTriggerEvent,
}));

export const mockJobs = () => {
  afterEach(() => {
    mockTriggerEvent.mockClear();
  });

  return { triggerEvent: mockTriggerEvent };
};

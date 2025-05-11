import { afterEach, vi } from "vitest";
import { inngest } from "@/inngest/client";

export const mockInngest = () => {
  const spy = vi.spyOn(inngest, "send").mockImplementation(() => Promise.resolve({ ids: [] }));

  afterEach(() => {
    spy.mockClear();
  });

  return { send: spy };
};

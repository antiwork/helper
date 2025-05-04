import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockHelperWidget } from "../test/utils";
import { useHelper } from "./useHelper";

describe("useHelper", () => {
  let mocks: ReturnType<typeof mockHelperWidget>;

  beforeEach(() => {
    mocks = mockHelperWidget();
  });

  it("provides show function", () => {
    const { result } = renderHook(() => useHelper());

    result.current.show();

    expect(mocks.mockShow).toHaveBeenCalled();
  });

  it("provides toggle function", () => {
    const { result } = renderHook(() => useHelper());

    result.current.toggle();

    expect(mocks.mockToggle).toHaveBeenCalled();
  });

  it("provides sendPrompt function", () => {
    const { result } = renderHook(() => useHelper());
    const testPrompt = "test prompt";

    result.current.sendPrompt(testPrompt);

    expect(mocks.mockSendPrompt).toHaveBeenCalledWith(testPrompt);
  });

  it("does not throw if HelperWidget is not defined", () => {
    vi.stubGlobal("HelperWidget", undefined);

    const { result } = renderHook(() => useHelper());

    expect(() => result.current.show()).not.toThrow();
    expect(() => result.current.toggle()).not.toThrow();
    expect(() => result.current.sendPrompt("test")).not.toThrow();
  });
});

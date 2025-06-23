/**
 * @vitest-environment jsdom
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSavingIndicator } from "@/components/hooks/useSavingIndicator";

describe("useSavingIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should initialize with idle state", () => {
    const { result } = renderHook(() => useSavingIndicator());

    expect(result.current.state).toBe("idle");
  });

  it("should transition to saving state", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setState("saving");
    });

    expect(result.current.state).toBe("saving");
  });

  it("should transition to saved state and auto-reset after 2 seconds", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setState("saved");
    });

    expect(result.current.state).toBe("saved");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state).toBe("idle");
  });

  it("should transition to error state and NOT auto-reset", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setState("error");
    });

    expect(result.current.state).toBe("error");

    // Error should not auto-hide - wait longer than previous timeout
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.state).toBe("error");
  });

  it("should reset state manually", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setState("saved");
    });

    expect(result.current.state).toBe("saved");

    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toBe("idle");
  });

  it("should clear previous timeout when setting new state", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setState("saved");
    });

    expect(result.current.state).toBe("saved");

    act(() => {
      result.current.setState("error");
    });

    expect(result.current.state).toBe("error");

    // Since errors don't auto-hide, it should stay in error state
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.state).toBe("error");
  });

  it("should cleanup timeout on unmount", () => {
    const { result, unmount } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setState("saved");
    });

    expect(result.current.state).toBe("saved");

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });
});

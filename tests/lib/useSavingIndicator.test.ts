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
    expect(result.current.isIdle).toBe(true);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.isSaved).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it("should transition to saving state", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setSaving();
    });

    expect(result.current.state).toBe("saving");
    expect(result.current.isSaving).toBe(true);
  });

  it("should transition to saved state and auto-reset after 2 seconds", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setSaved();
    });

    expect(result.current.state).toBe("saved");
    expect(result.current.isSaved).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.isIdle).toBe(true);
  });

  it("should transition to error state and auto-reset after 3 seconds", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setError();
    });

    expect(result.current.state).toBe("error");
    expect(result.current.isError).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.state).toBe("idle");
    expect(result.current.isIdle).toBe(true);
  });

  it("should reset state manually", () => {
    const { result } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setSaved();
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
      result.current.setSaved();
    });

    expect(result.current.state).toBe("saved");

    act(() => {
      result.current.setError();
    });

    expect(result.current.state).toBe("error");

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state).toBe("error");

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.state).toBe("idle");
  });

  it("should cleanup timeout on unmount", () => {
    const { result, unmount } = renderHook(() => useSavingIndicator());

    act(() => {
      result.current.setSaved();
    });

    expect(result.current.state).toBe("saved");

    unmount();

    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });
});

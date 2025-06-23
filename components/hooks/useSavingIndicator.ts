import { useEffect, useRef, useState } from "react";

export type SavingState = "idle" | "saving" | "saved" | "error";

// Auto-hide timing constants
const AUTO_HIDE_SUCCESS = 2000; // 2 seconds

export function useSavingIndicator() {
  const [state, setState] = useState<SavingState>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setStateWithTimer = (newState: SavingState) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setState(newState);

    // Only auto-hide success state, keep errors visible for user action
    if (newState === "saved") {
      timeoutRef.current = setTimeout(() => setState("idle"), AUTO_HIDE_SUCCESS);
    }
  };

  const reset = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState("idle");
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    setState: setStateWithTimer,
    reset,
  };
}

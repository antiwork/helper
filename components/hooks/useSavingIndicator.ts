import { useEffect, useRef, useState } from "react";

export type SavingState = "idle" | "saving" | "saved" | "error";

// Auto-hide timing constants
const AUTO_HIDE_SUCCESS = 2000; // 2 seconds
const AUTO_HIDE_ERROR = 3000; // 3 seconds

export function useSavingIndicator() {
  const [state, setState] = useState<SavingState>("idle");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setSaving = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState("saving");
  };

  const setSaved = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState("saved");
    timeoutRef.current = setTimeout(() => setState("idle"), AUTO_HIDE_SUCCESS);
  };

  const setError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState("error");
    timeoutRef.current = setTimeout(() => setState("idle"), AUTO_HIDE_ERROR);
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
    setSaving,
    setSaved,
    setError,
    reset,
    isSaving: state === "saving",
    isSaved: state === "saved",
    isError: state === "error",
    isIdle: state === "idle",
  };
}

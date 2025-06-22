import { useEffect, useRef, useState } from "react";

export type SavingState = "idle" | "saving" | "saved" | "error";

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
    timeoutRef.current = setTimeout(() => setState("idle"), 2000);
  };

  const setError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState("error");
    timeoutRef.current = setTimeout(() => setState("idle"), 3000);
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

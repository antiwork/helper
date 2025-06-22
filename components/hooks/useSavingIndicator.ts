import { useEffect, useState } from "react";

export type SavingState = "idle" | "saving" | "saved" | "error";

export function useSavingIndicator() {
  const [state, setState] = useState<SavingState>("idle");

  const setSaving = () => setState("saving");
  
  const setSaved = () => {
    setState("saved");
    // Auto-hide the "saved" indicator after 2 seconds
    setTimeout(() => setState("idle"), 2000);
  };
  
  const setError = () => {
    setState("error");
    // Auto-hide the error indicator after 3 seconds
    setTimeout(() => setState("idle"), 3000);
  };

  const reset = () => setState("idle");

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
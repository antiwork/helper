import { Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavingState } from "@/components/hooks/useSavingIndicator";

interface SavingIndicatorProps {
  state: SavingState;
  className?: string;
}

export function SavingIndicator({ state, className }: SavingIndicatorProps) {
  if (state === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all duration-200",
        {
          "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300": state === "saving",
          "bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300": state === "saved",
          "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300": state === "error",
        },
        className
      )}
    >
      {state === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </>
      )}
      {state === "error" && (
        <>
          <X className="h-3 w-3" />
          <span>Error</span>
        </>
      )}
    </div>
  );
} 
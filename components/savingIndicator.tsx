import { Check, Loader2, X } from "lucide-react";
import type { SavingState } from "@/components/hooks/useSavingIndicator";
import { cn } from "@/lib/utils";

interface SavingIndicatorProps {
  state: SavingState;
  className?: string;
}

export function SavingIndicator({ state, className }: SavingIndicatorProps) {
  if (state === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-all duration-200",
        {
          "text-muted-foreground": state === "saving" || state === "saved",
          "bg-destructive/10 text-destructive border border-destructive/20": state === "error",
        },
        className,
      )}
    >
      {state === "saving" && (
        <>
          <Loader2 className="h-2.5 w-2.5 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {state === "saved" && (
        <>
          <Check className="h-2.5 w-2.5" />
          <span>Saved</span>
        </>
      )}
      {state === "error" && (
        <>
          <X className="h-2.5 w-2.5" />
          <span>Error</span>
        </>
      )}
    </div>
  );
}

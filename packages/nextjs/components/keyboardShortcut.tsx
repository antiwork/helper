import React from "react";
import { cn } from "@/lib/utils";

interface KeyboardShortcutProps {
  children: React.ReactNode;
  className?: string;
}

export function KeyboardShortcut({ children, className }: KeyboardShortcutProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

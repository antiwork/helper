import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export function Timeline({ children, className }: TimelineProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
    </div>
  );
}

interface TimelineItemProps {
  children: ReactNode;
  className?: string;
}

function TimelineItem({ children, className }: TimelineItemProps) {
  return (
    <div className={cn("relative pl-10", className)}>
      {children}
    </div>
  );
}

interface TimelineIndicatorProps {
  children: ReactNode;
  className?: string;
}

TimelineItem.Indicator = function TimelineIndicator({ children, className }: TimelineIndicatorProps) {
  return (
    <div
      className={cn(
        "absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white",
        className
      )}
    >
      {children}
    </div>
  );
};

interface TimelineContentProps {
  children: ReactNode;
  className?: string;
}

TimelineItem.Content = function TimelineContent({ children, className }: TimelineContentProps) {
  return (
    <div className={cn("flex min-h-[40px] flex-1 items-center px-4", className)}>
      {children}
    </div>
  );
};

export { TimelineItem }; 

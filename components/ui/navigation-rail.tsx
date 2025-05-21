import * as React from "react";
import { cn } from "@/lib/utils";

const NavigationRail = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, children, ...props }, ref) => {
    return (
      <div className={cn("hidden md:flex flex-col items-center gap-2 p-2 text-sidebar-foreground", className)} ref={ref} {...props}>
        {children}
      </div>
    );
  }
);
NavigationRail.displayName = "NavigationRail";

export { NavigationRail }; 
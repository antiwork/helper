import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Panel = ({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "flex-1 border flex flex-col p-5 overflow-auto rounded-lg bg-white dark:bg-muted text-bright-foreground dark:text-muted-foreground",
      className,
    )}
  >
    {title && <h4 className="scroll-m-20 mb-2 text-sm font-semibold tracking-tight uppercase">{title}</h4>}
    <div className="flex-1">{children}</div>
  </div>
);

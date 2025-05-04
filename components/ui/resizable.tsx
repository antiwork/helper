"use client";

import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({ className, ...props }: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) => (
  <ResizablePrimitive.PanelGroup
    className={cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", className)}
    {...props}
  />
);

const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = ({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> & {
  withHandle?: boolean;
}) => (
  <ResizablePrimitive.PanelResizeHandle
    className={cn(
      "group relative flex items-center justify-center bg-muted",
      // Base styles for horizontal handle
      "cursor-col-resize",
      "hover:border-r-primary hover:border-r-2 border-r border-border",
      // Vertical handle styles
      "data-[panel-group-direction=vertical]:w-full",
      "data-[panel-group-direction=vertical]:cursor-row-resize",
      "data-[panel-group-direction=vertical]:border-r-0",
      "data-[panel-group-direction=vertical]:border-t data-[panel-group-direction=vertical]:hover:border-t-2",
      "data-[panel-group-direction=vertical]:hover:border-t-primary",
      // Handle rotation for vertical
      "[&[data-panel-group-direction=vertical]>div]:rotate-90",
      className,
    )}
    {...props}
  >
    {withHandle && (
      <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-stone-200 bg-stone-200 opacity-0 transition-opacity group-hover:opacity-100 group-active:opacity-100 dark:border-stone-800 dark:bg-stone-800">
        <GripVertical className="h-2.5 w-2.5" />
      </div>
    )}
  </ResizablePrimitive.PanelResizeHandle>
);

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

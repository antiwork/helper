"use client";

import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMemo } from "react";
import { useNativePlatform } from "@/components/useNativePlatform";
import { cn } from "@/lib/utils";

export const TauriDragArea = ({ className }: { className: string }) => {
  const { isTauri } = useNativePlatform();
  const appWindow = useMemo(() => (isTauri ? getCurrentWindow() : null), [isTauri]);

  return (
    <div
      className={cn("fixed select-none cursor-default", className)}
      onMouseDown={(e) => {
        if (e.buttons === 1) {
          if (e.detail === 2) {
            appWindow?.toggleMaximize();
          } else {
            appWindow?.startDragging();
          }
        }
      }}
    />
  );
};

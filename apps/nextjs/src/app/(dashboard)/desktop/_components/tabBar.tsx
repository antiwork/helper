"use client";

import { XMarkIcon } from "@heroicons/react/16/solid";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useMemo, useState } from "react";
import { resolveDeepLinkUrl } from "@/components/deepLinkHandler";
import { useNativePlatform } from "@/components/useNativePlatform";
import { useRunOnce } from "@/components/useRunOnce";
import { cn } from "@/lib/utils";

export const TabBar = ({ initialTabUrl }: { initialTabUrl?: string }) => {
  const { nativePlatform } = useNativePlatform();
  const [tabs, setTabs] = useState<{ id: string; title: string; url: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  useRunOnce(() => {
    listen<{
      tabs: { id: string; title: string; url: string }[];
      activeTab: string;
    }>("tab-bar-update", (event) => {
      setTabs(event.payload.tabs);
      setActiveTab(event.payload.activeTab);
      localStorage.setItem("tabUrls", JSON.stringify(event.payload.tabs.map((tab) => tab.url)));
    });

    // const savedTabs = JSON.parse(localStorage.getItem("tabUrls") ?? "[]");
    const savedTabs = [];
    if (initialTabUrl) {
      const resolved = resolveDeepLinkUrl(initialTabUrl);
      if (resolved) savedTabs.push(resolved);
    }
    savedTabs.forEach((url: string) => invoke("add_tab", { url }));
    if (savedTabs.length === 0) invoke("add_tab", { url: `${window.location.origin}/mailboxes` });
  });

  return (
    <div className="flex h-10 text-sm">
      {nativePlatform === "macos" && <DragArea className="w-[70px] border-b" />}
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            "flex items-center border-b px-4",
            activeTab === tab.id && "bg-background border-x border-b-transparent",
          )}
        >
          {tab.title ?? <em>Loading ...</em>}
          <button
            className="p-1 rounded transition-colors hover:bg-muted"
            onClick={() => invoke("close_tab", { id: tab.id })}
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      ))}
      <DragArea className="flex-1 border-b" />
    </div>
  );
};

const DragArea = ({ className }: { className: string }) => {
  const appWindow = useMemo(() => getCurrentWindow(), []);
  return (
    <div
      className={className}
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

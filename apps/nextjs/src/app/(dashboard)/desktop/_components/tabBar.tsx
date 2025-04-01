"use client";

import { EllipsisHorizontalIcon, PlusIcon, XMarkIcon } from "@heroicons/react/16/solid";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { uniqBy } from "lodash";
import { Reorder } from "motion/react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { resolveDeepLinkUrl } from "@/components/deepLinkHandler";
import { useNativePlatform } from "@/components/useNativePlatform";
import { useRunOnce } from "@/components/useRunOnce";
import { api } from "@/trpc/react";

export const TabBar = ({ initialTabUrl }: { initialTabUrl?: string }) => {
  const { nativePlatform } = useNativePlatform();
  const [tabs, setTabs] = useState<{ id: string; title: string; url: string }[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const recentlyClosedTabs = useRef<{ title: string; url: string }[]>([]);
  const { refetch: checkSignedIn } = api.isSignedIn.useQuery(undefined, { enabled: false, staleTime: 0 });
  const router = useRouter();

  useRunOnce(() => {
    listen<{
      tabs: { id: string; title: string; url: string }[];
      activeTab: string;
    }>("tab-bar-update", async (event) => {
      if (event.payload.tabs.length === 0) {
        if (await checkSignedIn()) {
          invoke("add_tab", { url: `${window.location.origin}/mailboxes` });
        } else {
          router.push("/login");
        }
        return;
      }

      setTabs(event.payload.tabs);
      setActiveTab(event.payload.activeTab);
      recentlyClosedTabs.current = recentlyClosedTabs.current.filter(
        (tab) => !event.payload.tabs.some((t) => t.url === tab.url),
      );
      localStorage.setItem(
        "recentTabs",
        JSON.stringify(event.payload.tabs.map((tab) => ({ title: tab.title, url: tab.url }))),
      );
    });

    recentlyClosedTabs.current = JSON.parse(localStorage.getItem("recentTabs") ?? "[]");

    const resolved = initialTabUrl ? resolveDeepLinkUrl(initialTabUrl) : null;
    invoke("add_tab", { url: resolved ?? `${window.location.origin}/mailboxes` });
  });

  return (
    <div
      className="flex h-10 text-sm relative"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        if (e.buttons === 1) {
          if (e.detail === 2) {
            getCurrentWindow().toggleMaximize();
          } else {
            getCurrentWindow().startDragging();
          }
        }
      }}
    >
      <div className="absolute -z-10 inset-0 border-b" />
      {nativePlatform === "macos" && <div className="w-[70px] border-r" />}
      <Reorder.Group
        axis="x"
        values={tabs}
        layoutScroll
        style={{ overflowX: "scroll", display: "flex" }}
        onReorder={(newTabs) => {
          invoke("reorder_tabs", { tabIds: newTabs.map((tab) => tab.id) });
          setTabs(newTabs);
        }}
      >
        {tabs.map((tab) => (
          <Reorder.Item key={tab.id} value={tab}>
            <div
              data-no-drag
              key={tab.id}
              className="relative h-full w-56 flex items-center pl-4 pr-2 border-r border-b bg-background cursor-pointer"
              onClick={() => invoke("set_active_tab", { tabId: tab.id })}
            >
              {activeTab === tab.id && <div className="absolute inset-x-0 bottom-0 h-0.5 bg-bright" />}
              <span className="flex-1 truncate">{tab.title || <em>Loading ...</em>}</span>
              <button
                className="ml-2 p-1 rounded transition-colors hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  invoke("close_tab", { tabId: tab.id });
                  recentlyClosedTabs.current = uniqBy([tab, ...recentlyClosedTabs.current], "url").slice(0, 10);
                }}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
      {/* Hide control buttons initially to avoid layout shift */}
      {tabs.length > 0 && (
        <>
          <button
            className="self-center ml-1 p-2 rounded transition-colors hover:bg-muted"
            onClick={() => invoke("add_tab", { url: `${window.location.origin}/mailboxes` })}
          >
            <PlusIcon className="w-4 h-4" />
          </button>
          <button
            className="self-center ml-auto mr-1 p-2 rounded transition-colors hover:bg-muted"
            onClick={() =>
              invoke("toggle_tab_context_menu", {
                tabs: JSON.stringify(recentlyClosedTabs.current),
              })
            }
          >
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
};

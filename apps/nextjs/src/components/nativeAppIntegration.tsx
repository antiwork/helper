"use client";

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getTauriPlatform } from "@/components/useNativePlatform";

export function NativeAppIntegration() {
  const router = useRouter();
  const [recentlyClosedTabs, setRecentlyClosedTabs] = useState<{ url: string; title: string }[] | null>(null);

  useEffect(() => {
    const tauriPlatform = getTauriPlatform();
    if (!tauriPlatform && !window.ReactNativeWebView) return;
    if (tauriPlatform && getCurrentWebview().label === "tab_bar") return;

    if (tauriPlatform) {
      listen<string>("tab-context-menu", (event) => {
        setRecentlyClosedTabs(event.payload ? JSON.parse(event.payload) : null);
      });
    }

    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      if (anchor.getAttribute("target") === "_blank") {
        const href = anchor.getAttribute("href");
        if (!href) return;

        const url = new URL(href, window.location.origin);

        if (window.ReactNativeWebView) {
          event.preventDefault();
          window.ReactNativeWebView.postMessage(
            JSON.stringify({
              type: "openUrl",
              url: url.toString(),
            }),
          );
        } else if (tauriPlatform) {
          // Open links relevant to the current origin in the app window
          if (url.origin === window.location.origin) {
            if (
              event.ctrlKey ||
              event.metaKey ||
              (event.target instanceof HTMLAnchorElement && event.target.getAttribute("target") === "_blank")
            ) {
              invoke("add_tab", { url: url.toString() });
            } else {
              router.push(`${url.pathname}${url.search}`);
            }
          } else {
            event.preventDefault();
            openUrl(url.toString());
          }
        }
      }
    };

    const setupTitleObserver = () => {
      if (!tauriPlatform) return;

      if (document.title) {
        invoke("update_tab", { tabId: getCurrentWebview().label, title: document.title });
      }

      const titleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "childList") {
            const addedTitles = Array.from(mutation.addedNodes).filter((node) => node.nodeName === "TITLE");
            if (addedTitles.length > 0) {
              addedTitles.forEach((titleNode) => {
                titleObserver.observe(titleNode, {
                  childList: true,
                  characterData: true,
                  subtree: true,
                });
              });
              invoke("update_tab", { tabId: getCurrentWebview().label, title: document.title });
            }
          }

          if (
            mutation.type === "characterData" &&
            mutation.target.nodeName === "#text" &&
            mutation.target.parentNode?.nodeName === "TITLE"
          ) {
            invoke("update_tab", { tabId: getCurrentWebview().label, title: document.title });
          }
        });
      });

      document.querySelectorAll("title").forEach((titleElement) => {
        titleObserver.observe(titleElement, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      });

      titleObserver.observe(document.querySelector("head")!, {
        childList: true,
        subtree: true,
      });

      return titleObserver;
    };

    const titleObserver = setupTitleObserver();
    document.addEventListener("click", handleLinkClick);

    return () => {
      document.removeEventListener("click", handleLinkClick);
      titleObserver?.disconnect();
    };
  }, []);

  return recentlyClosedTabs ? (
    <div className="fixed -top-4 right-1">
      <Popover open={true} onOpenChange={(open) => !open && invoke("toggle_tab_context_menu", { tabs: "" })}>
        <PopoverTrigger>
          <div />
        </PopoverTrigger>
        <PopoverContent align="end" className="p-1">
          {recentlyClosedTabs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center text-xs text-muted-foreground px-10">
              Recently closed tabs will appear here.
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">Recently closed tabs</div>
              {recentlyClosedTabs
                .filter((tab) => tab.url && tab.title)
                .map((tab) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="block w-full text-left truncate"
                    key={tab.url}
                    onClick={() => {
                      invoke("add_tab", { url: tab.url });
                      invoke("toggle_tab_context_menu", { tabs: "" });
                    }}
                  >
                    {tab.title}
                  </Button>
                ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  ) : null;
}

export default NativeAppIntegration;

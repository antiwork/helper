"use client";

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { getTauriPlatform } from "@/components/useNativePlatform";

export function NativeLinkOpener() {
  const router = useRouter();

  useEffect(() => {
    const tauriPlatform = getTauriPlatform();
    if (!tauriPlatform && !window.ReactNativeWebView) return;

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
            router.push(`${url.pathname}${url.search}`);
          } else {
            event.preventDefault();
            openUrl(url.toString());
          }
        }
      }
    };

    const setupTitleObserver = () => {
      if (!tauriPlatform) return;

      const tabId = getCurrentWebview().label;
      if (tabId === "tab_bar") return;

      if (document.title) {
        invoke("update_tab", { tabId, title: document.title });
      }

      const titleObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "childList" ||
            (mutation.type === "characterData" &&
              mutation.target.nodeName === "#text" &&
              mutation.target.parentNode?.nodeName === "TITLE")
          ) {
            invoke("update_tab", { tabId, title: document.title });
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

      titleObserver.observe(document.querySelector("head")!, { childList: true });

      return titleObserver;
    };

    const titleObserver = setupTitleObserver();
    document.addEventListener("click", handleLinkClick);

    return () => {
      document.removeEventListener("click", handleLinkClick);
      titleObserver?.disconnect();
    };
  }, []);

  return null;
}

export default NativeLinkOpener;

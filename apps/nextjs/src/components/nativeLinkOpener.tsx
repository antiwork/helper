"use client";

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

    document.addEventListener("click", handleLinkClick);

    return () => {
      document.removeEventListener("click", handleLinkClick);
    };
  }, []);

  return null;
}

export default NativeLinkOpener;

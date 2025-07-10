"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMediaQuery } from "react-responsive";
import { useTabsState } from "@/app/(dashboard)/[category]/tabBar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const StandaloneDisplayIntegration = () => {
  const isStandalone = useMediaQuery({ query: "(display-mode: standalone)" });
  const router = useRouter();
  const { addTab } = useTabsState();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; target: HTMLAnchorElement } | null>(null);

  useEffect(() => {
    if (!isStandalone) return;

    const handleLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement;
      const anchor = target.closest("a");

      if (!anchor) return;

      if (anchor.getAttribute("target") === "_blank") {
        const href = anchor.getAttribute("href");
        if (!href) return;

        const url = new URL(href, window.location.origin);

        // Open links relevant to the current origin in the app window
        if (url.origin === window.location.origin) {
          if (
            event.ctrlKey ||
            event.metaKey ||
            (event.target instanceof HTMLAnchorElement && event.target.getAttribute("target") === "_blank")
          ) {
            addTab(url.toString());
          } else {
            router.push(`${url.pathname}${url.search}`);
          }
        } else {
          event.preventDefault();
          window.open(url.toString(), "_blank");
        }
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      if (!isStandalone) return;

      const target = event.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor?.href.startsWith(window.location.origin)) return;

      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, target: anchor });
    };

    document.addEventListener("click", handleLinkClick);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("click", handleLinkClick);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  return contextMenu ? (
    <div className="fixed" style={{ top: contextMenu.y - 8, left: contextMenu.x }}>
      <Popover open={true} onOpenChange={(open) => !open && setContextMenu(null)}>
        <PopoverTrigger>
          <div />
        </PopoverTrigger>
        <PopoverContent className="p-1">
          <Button
            variant="ghost"
            size="sm"
            className="block w-full text-left truncate focus-visible:ring-0"
            onClick={() => {
              addTab(contextMenu.target.href);
            }}
          >
            Open in new tab
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="block w-full text-left truncate focus-visible:ring-0"
            onClick={() => navigator.clipboard.writeText(contextMenu.target.href)}
          >
            Copy link
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  ) : null;
};

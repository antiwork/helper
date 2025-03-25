"use client";

import { DeepLinkRedirect } from "@/components/deepLinkRedirect";
import { TauriDragArea } from "@/components/tauriDragArea";
import { useNativePlatform } from "@/components/useNativePlatform";
import { LayoutInfoProvider } from "./_components/useLayoutInfo";

export default function InboxLayout({ children }: { children: React.ReactNode }) {
  const { nativePlatform } = useNativePlatform();

  return (
    <LayoutInfoProvider>
      {nativePlatform === "macos" && <TauriDragArea className="top-0 inset-x-0 h-3" />}
      <DeepLinkRedirect />
      {children}
    </LayoutInfoProvider>
  );
}

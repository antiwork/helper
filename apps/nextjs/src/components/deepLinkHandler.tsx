"use client";

import { onOpenUrl } from "@tauri-apps/plugin-deep-link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { create } from "zustand";
import { getTauriPlatform } from "@/components/useNativePlatform";

const useDeepLink = create<{
  url: string | null;
  setUrl: (url: string) => void;
}>((set) => ({
  url: null,
  setUrl: (url) => set({ url }),
}));

if (getTauriPlatform()) {
  onOpenUrl(([url]) => {
    if (url) useDeepLink.getState().setUrl(url.replace("antiwork-helper://", ""));
  });
}

export function DeepLinkHandler() {
  const router = useRouter();
  const { url } = useDeepLink();

  useEffect(() => {
    if (!url) return;
    const resolved = new URL(url, window.location.origin);
    if (resolved.origin !== window.location.origin) return;
    router.push(resolved.toString());
  }, [url]);

  return null;
}

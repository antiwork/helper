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
    const resolved = url && resolveDeepLinkUrl(url);
    if (!resolved) return;
    router.push(resolved);
  }, [url]);

  return null;
}

export const resolveDeepLinkUrl = (url: string) => {
  const resolved = new URL(url, window.location.origin);
  if (resolved.origin !== window.location.origin) return null;
  return resolved.toString();
};

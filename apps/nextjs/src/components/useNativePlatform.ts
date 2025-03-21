import * as osPlugin from "@tauri-apps/plugin-os";
import { useEffect, useState } from "react";

declare global {
  interface Window {
    __EXPO__?: {
      platform: "ios" | "android";
      onToggleSidebar: (handler: () => void) => void;
    };
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export const getTauriPlatform = () => {
  if (typeof window !== "undefined" && window.__TAURI_OS_PLUGIN_INTERNALS__) return osPlugin.type();
  return null;
};

export const getExpoPlatform = () => {
  if (typeof window !== "undefined" && window.__EXPO__) return window.__EXPO__.platform;
  return null;
};

export const getNativePlatform = () => getTauriPlatform() ?? getExpoPlatform() ?? null;

export const useNativePlatform = () => {
  const [platform, setPlatform] = useState<ReturnType<typeof getNativePlatform>>(null);

  useEffect(() => {
    setPlatform(getNativePlatform());
  }, []);

  return {
    nativePlatform: platform,
    isTauri: platform === "macos" || platform === "windows" || platform === "linux",
    isExpo: platform === "ios" || platform === "android",
  };
};

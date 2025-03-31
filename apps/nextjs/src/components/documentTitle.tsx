import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useEffect } from "react";
import { getTauriPlatform } from "@/components/useNativePlatform";

export const DocumentTitle = ({ children }: { children: string }) => {
  useEffect(() => {
    if (!getTauriPlatform()) return;
    invoke("update_tab", { tabId: getCurrentWebview().label, title: children });
  }, [children]);

  return <title>{children}</title>;
};

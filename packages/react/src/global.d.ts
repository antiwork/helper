import type { HelperWidgetConfig } from "@helperai/sdk";

declare global {
  interface Window {
    HelperWidget: {
      init: (config: HelperWidgetConfig) => void;
      show: () => void;
      hide: () => void;
      toggle: () => void;
      sendPrompt: (prompt: string) => void;
    };
  }
}

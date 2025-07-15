import type { HelperWidgetConfig } from "./types";

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

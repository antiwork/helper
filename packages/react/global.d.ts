import type { HelperWidgetConfig } from "./src/types";

declare global {
  interface Window {
    HelperWidget?: {
      init: (config: HelperWidgetConfig) => void;
      show: () => void;
      toggle: () => void;
      sendPrompt: (prompt: string) => void;
      hide: () => void;
    };
  }
}

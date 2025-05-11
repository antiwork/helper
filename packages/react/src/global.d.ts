import type { HelperConfig } from "./types";

declare global {
  interface Window {
    HelperWidget: {
      init: (config: HelperConfig) => void;
      show: () => void;
      hide: () => void;
      toggle: () => void;
      sendPrompt: (prompt: string) => void;
    };
  }
}

import type { HelperConfig } from "./src/types";

declare global {
  interface Window {
    HelperWidget?: {
      init: (config: HelperConfig) => void;
      show: () => void;
      toggle: () => void;
      sendPrompt: (prompt: string) => void;
      hide: () => void;
    };
  }
}

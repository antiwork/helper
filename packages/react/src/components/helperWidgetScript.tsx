"use client";

import { useEffect } from "react";
import type { HelperWidgetConfig } from "../types";

export type HelperWidgetScriptProps = HelperWidgetConfig & {
  host: string;
  onError?: (error: Error) => void;
};

export function HelperWidgetScript({ host, onError, ...props }: HelperWidgetScriptProps) {
  useEffect(() => {
    const scriptSrc = `${host}/widget/sdk.js`;
    const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);

    if (existingScript) {
      console.warn(
        "Helper widget script already exists. You may have multiple HelperProvider components - please remove all but one.",
      );
      if (window.HelperWidget) {
        window.HelperWidget.init(props);
      }
      return;
    }

    const script = document.createElement("script");
    script.src = scriptSrc;
    script.async = true;
    script.dataset.delayInit = "true";

    script.onload = () => {
      if (!window.HelperWidget) {
        const error = new Error("Helper widget failed to initialize");
        onError?.(error);
        return;
      }
      window.HelperWidget.init(props);
    };

    script.onerror = (event) => {
      const error = new Error("Failed to load Helper widget script");
      onError?.(error);
    };

    document.body.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [props, host, onError]);

  return null;
}

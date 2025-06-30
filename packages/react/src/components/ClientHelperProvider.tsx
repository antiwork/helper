"use client";

import { useEffect } from "react";
import type { HelperWidgetConfig } from "../types";

type ClientHelperProviderProps = HelperWidgetConfig & {
  host: string;
  onError?: (error: Error) => void;
};

export function ClientHelperProvider({ host, onError, ...props }: ClientHelperProviderProps) {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `${host}/widget/sdk.js`;
    script.async = true;

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

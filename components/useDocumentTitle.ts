import { useEffect, useRef } from "react";

export function useDocumentTitle(title: string, retainOnUnmount = false) {
  const defaultTitle = useRef(typeof window !== "undefined" ? document.title : "");

  useEffect(() => {
    if (typeof window !== "undefined" && title != null) {
      document.title = title;
    }
  }, [title]);

  useEffect(() => {
    return () => {
      if (!retainOnUnmount && typeof window !== "undefined") {
        document.title = defaultTitle.current;
      }
    };
  }, [retainOnUnmount]);
}

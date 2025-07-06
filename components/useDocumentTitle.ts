import { useEffect, useRef } from "react";

export function useDocumentTitle(title: string, retainOnUnmount = false) {
  const defaultTitle = useRef(document.title);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    return () => {
      if (!retainOnUnmount) {
        document.title = defaultTitle.current;
      }
    };
  }, []);
}

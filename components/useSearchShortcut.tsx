import { isMacOS } from "@tiptap/core";
import { useEffect } from "react";

const useSearchShortcut = (callback: (event: KeyboardEvent) => void, { key = "k" }: { key?: string } = {}) => {
  useEffect(() => {
    const isMac = isMacOS();

    const handler = (event: KeyboardEvent) => {
      const modifierKeyPressed = isMac ? event.metaKey : event.ctrlKey;
      const activeElement = document.activeElement;
      const isTextInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true";

      if (event.key.toLowerCase() === key.toLowerCase() && modifierKeyPressed && !isTextInput) {
        callback(event);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback]);
};

export default useSearchShortcut;

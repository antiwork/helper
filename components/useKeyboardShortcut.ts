import { useEffect } from "react";

const useKeyboardShortcut = (
  key: string,
  callback: (event: KeyboardEvent) => void,
  { enableInDialog }: { enableInDialog?: boolean } = {},
) => {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const modifierKeyPressed = event.ctrlKey || event.altKey || event.metaKey;
      const activeElement = document.activeElement;
      const isTextInput =
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute("contenteditable") === "true";
      const disabledByDialog = !!document.querySelector("[role=dialog]") && !enableInDialog;

      if (event.key.toLowerCase() === key.toLowerCase() && !modifierKeyPressed && !isTextInput && !disabledByDialog) {
        callback(event);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, callback]);
};

export default useKeyboardShortcut;

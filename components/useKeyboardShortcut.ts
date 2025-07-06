import { useKeyDown } from "./hooks/useWindowEvent";

const useKeyboardShortcut = (
  key: string,
  callback: (event: KeyboardEvent) => void,
  { enableInDialog }: { enableInDialog?: boolean } = {},
) => {
  useKeyDown((event) => {
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
  });
};

export default useKeyboardShortcut;

import useKeyboardShortcut from "@/components/useKeyboardShortcut";

export const useConversationNavigationHotkeys = (
  moveToNextConversation: () => void,
  moveToPreviousConversation: () => void,
) => {
  useKeyboardShortcut("j", moveToNextConversation);
  useKeyboardShortcut("k", moveToPreviousConversation);
};

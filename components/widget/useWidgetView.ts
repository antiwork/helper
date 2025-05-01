import { create } from "zustand";

type View = "chat" | "previous";

type WidgetViewState = {
  currentView: View;
  isNewConversation: boolean;
  setCurrentView: (view: View) => void;
  setIsNewConversation: (isNew: boolean) => void;
  handleSelectConversation: (slug: string) => string;
  handleNewConversation: () => void;
};

export const useWidgetView = create<WidgetViewState>((set) => ({
  currentView: "chat",
  isNewConversation: false,

  setCurrentView: (view) => set({ currentView: view }),
  setIsNewConversation: (isNew) => set({ isNewConversation: isNew }),

  handleSelectConversation: (slug) => {
    set({ currentView: "chat", isNewConversation: false });
    return slug;
  },

  handleNewConversation: () => {
    set({ currentView: "chat", isNewConversation: true });
  },
}));

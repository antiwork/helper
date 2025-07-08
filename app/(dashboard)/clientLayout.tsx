"use client";

import { create } from "zustand";

export const useShowChatWidget = create<{
  showChatWidget: boolean;
  setShowChatWidget: (showChatWidget: boolean) => void;
}>((set) => ({
  showChatWidget: false,
  setShowChatWidget: (showChatWidget) => set({ showChatWidget }),
}));

export default function InboxClientLayout({ children }: { children: React.ReactNode }) {
  const { showChatWidget } = useShowChatWidget();

  return (
    <>
      {/* We show the widget for testing on the chat settings page. Need to improve the SDK to allow destroying the widget so we can move the provider there */}
      {!showChatWidget && (
        <style>
          {`
            .helper-widget-icon {
              display: none !important;
            }
          `}
        </style>
      )}
      {children}
    </>
  );
}

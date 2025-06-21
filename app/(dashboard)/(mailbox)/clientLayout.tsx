"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { create } from "zustand";
import { buildThemeCss, MailboxTheme } from "@/lib/themes";

export const useShowChatWidget = create<{
  showChatWidget: boolean;
  setShowChatWidget: (showChatWidget: boolean) => void;
}>((set) => ({
  showChatWidget: false,
  setShowChatWidget: (showChatWidget) => set({ showChatWidget }),
}));

const InboxThemeContext = createContext<{
  theme: MailboxTheme | undefined;
  setTheme: (theme: MailboxTheme | undefined) => void;
}>({
  theme: undefined,
  setTheme: () => {},
});

export const useInboxTheme = () => useContext(InboxThemeContext);

export default function InboxClientLayout({
  children,
  theme: initialTheme,
}: {
  children: React.ReactNode;
  theme?: MailboxTheme;
}) {
  const [theme, setTheme] = useState<MailboxTheme | undefined>(initialTheme);
  const { showChatWidget } = useShowChatWidget();
  const themeCss = useMemo(() => buildThemeCss(theme), [theme]);

  return (
    <InboxThemeContext.Provider value={{ theme, setTheme }}>
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
      <style>{themeCss}</style>
      {children}
    </InboxThemeContext.Provider>
  );
}

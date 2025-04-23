"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { DeepLinkRedirect } from "@/components/deepLinkRedirect";
import { TauriDragArea } from "@/components/tauriDragArea";
import { useNativePlatform } from "@/components/useNativePlatform";
import { buildThemeCss, MailboxTheme } from "@/lib/themes";
import { LayoutInfoProvider } from "./useLayoutInfo";

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
  const { nativePlatform, isLegacyTauri } = useNativePlatform();
  const [theme, setTheme] = useState<MailboxTheme | undefined>(initialTheme);

  const themeCss = useMemo(() => buildThemeCss(theme), [theme]);

  return (
    <InboxThemeContext.Provider value={{ theme, setTheme }}>
      <style>{themeCss}</style>
      <LayoutInfoProvider>
        {nativePlatform === "macos" && isLegacyTauri && <TauriDragArea className="top-0 inset-x-0 h-3" />}
        <DeepLinkRedirect />
        {children}
      </LayoutInfoProvider>
    </InboxThemeContext.Provider>
  );
}

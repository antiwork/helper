"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { buildThemeCss, MailboxTheme } from "@/lib/themes";

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

  const themeCss = useMemo(() => buildThemeCss(theme), [theme]);

  return (
    <InboxThemeContext.Provider value={{ theme, setTheme }}>
      <style>{themeCss}</style>
      {children}
    </InboxThemeContext.Provider>
  );
}

import React from "react";

function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-dvh w-full">{children}</div>;
}

export default SettingsLayout;

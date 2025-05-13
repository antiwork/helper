import React from "react";
import { withMailboxAuth } from "@/components/withMailboxAuth";

function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col h-dvh w-full">{children}</div>;
}

export default withMailboxAuth(SettingsLayout);

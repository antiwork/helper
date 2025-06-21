import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

function SessionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <main className="flex flex-col h-screen text-foreground w-full bg-sidebar">{children}</main>
    </SidebarProvider>
  );
}

export default SessionsLayout;

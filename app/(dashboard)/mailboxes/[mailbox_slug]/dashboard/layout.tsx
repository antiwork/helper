import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <main className="flex flex-col h-dvh text-foreground w-full bg-sidebar">{children}</main>
    </SidebarProvider>
  );
}

export default DashboardLayout;

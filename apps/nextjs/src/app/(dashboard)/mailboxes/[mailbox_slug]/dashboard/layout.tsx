import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { withMailboxAuth } from "@/components/withMailboxAuth";

function DashboardLayout({
  params,
  children,
}: {
  params: Promise<{ mailbox_slug: string }>;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <main className="flex flex-col h-screen text-foreground w-full bg-sidebar">{children}</main>
    </SidebarProvider>
  );
}

export default withMailboxAuth(DashboardLayout);

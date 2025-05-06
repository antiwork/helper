import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { withMailboxAuth } from "@/components/withMailboxAuth";
import { ClientLayout } from "./clientLayout";

function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <ClientLayout>{children}</ClientLayout>
      </div>
    </SidebarProvider>
  );
}

export default withMailboxAuth(SettingsLayout);

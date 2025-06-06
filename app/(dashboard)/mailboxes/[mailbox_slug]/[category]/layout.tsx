import React from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

async function ConversationsLayout({
  params,
  children,
}: {
  params: Promise<{ mailbox_slug: string }>;
  children: React.ReactNode;
}) {
  const { mailbox_slug } = await params;

  return (
    <SidebarProvider>
      {children}
    </SidebarProvider>
  );
}

export default ConversationsLayout;

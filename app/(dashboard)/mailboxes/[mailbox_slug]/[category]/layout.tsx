import React from "react";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebar";
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
      <div className="flex-1 flex h-full flex-col lg:flex-row min-w-0">
        <AppSidebar mailboxSlug={mailbox_slug} />
        <main className="flex flex-col h-dvh text-foreground w-full min-w-0">{children}</main>
      </div>
    </SidebarProvider>
  );
}

export default ConversationsLayout;

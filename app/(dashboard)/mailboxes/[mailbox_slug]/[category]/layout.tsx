import React from "react";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { withMailboxAuth } from "@/components/withMailboxAuth";

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
      <AppSidebar mailboxSlug={mailbox_slug} />
      {children}
    </SidebarProvider>
  );
}

export default withMailboxAuth(ConversationsLayout);

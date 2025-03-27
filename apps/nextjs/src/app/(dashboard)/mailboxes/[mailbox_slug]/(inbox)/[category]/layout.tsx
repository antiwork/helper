import React from "react";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/appSidebar";
import { getSidebarInfo } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/getSidebarInfo";
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

  const sidebarInfo = await getSidebarInfo(mailbox_slug);

  return (
    <SidebarProvider>
      <div className="flex-1 flex h-full flex-col lg:flex-row min-w-0">
        <AppSidebar mailboxSlug={mailbox_slug} sidebarInfo={sidebarInfo} />
        <main className="flex flex-col min-h-screen text-foreground w-full min-w-0">{children}</main>
      </div>
    </SidebarProvider>
  );
}

export default withMailboxAuth(ConversationsLayout);

import React from "react";
import { AppSidebar } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { withMailboxAuth } from "@/components/withMailboxAuth";
import { getSidebarInfo } from "../getSidebarInfo";
import { ClientLayout } from "./clientLayout";

async function SettingsLayout({
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
      <div className="flex h-dvh w-full">
        <div className="md:hidden">
          <AppSidebar mailboxSlug={mailbox_slug} sidebarInfo={sidebarInfo} />
        </div>
        <ClientLayout>{children}</ClientLayout>
      </div>
    </SidebarProvider>
  );
}

export default withMailboxAuth(SettingsLayout);

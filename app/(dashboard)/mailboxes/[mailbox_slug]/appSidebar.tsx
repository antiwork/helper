"use client";

import { BarChart, Inbox, Search, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InboxProvider } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/inbox";
import { List } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/[category]/list/conversationList";
import { Avatar } from "@/components/ui/avatar";
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import { CategoryNav } from "./categoryNav";

declare global {
  interface Window {
    __unstable__onBeforeSetActive: () => void;
  }
}

export function AppSidebar({ mailboxSlug }: { mailboxSlug: string }) {
  const { data: mailboxes } = api.mailbox.list.useQuery();
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const { data: openCount } = api.mailbox.openCount.useQuery({ mailboxSlug });

  return (
    <Sidebar className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SidebarHeader />
      <SidebarContent className="flex flex-col flex-1 overflow-hidden">
        {isMobile ? (
          <div className="h-full flex flex-col gap-2 p-2">
            <Link
              href={`/mailboxes/${mailboxSlug}/conversations`}
              className={cn(
                "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                !pathname.includes("/search") &&
                  !pathname.includes("/dashboard") &&
                  !pathname.endsWith("/settings") &&
                  "bg-sidebar-accent",
              )}
            >
              <Inbox className="h-4 w-4" />
              <span>Inbox</span>
            </Link>
            <Link
              href={`/mailboxes/${mailboxSlug}/search`}
              className={cn(
                "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                pathname.includes("/search") && "bg-sidebar-accent",
              )}
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
            </Link>
            <Link
              href={`/mailboxes/${mailboxSlug}/dashboard`}
              className={cn(
                "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                pathname.includes("/dashboard") && "bg-sidebar-accent",
              )}
            >
              <BarChart className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href={`/mailboxes/${mailboxSlug}/settings`}
              className={cn(
                "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent",
                pathname.endsWith("/settings") && "bg-sidebar-accent",
              )}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>

            <div className="mb-auto" />

            {mailboxes?.map((mailbox) => (
              <Link
                key={mailbox.slug}
                href={`/mailboxes/${mailbox.slug}/conversations`}
                className={cn(
                  "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
                  "text-sidebar-foreground hover:bg-sidebar-accent",
                  mailbox.slug === mailboxSlug && "bg-sidebar-accent",
                )}
              >
                <Avatar src={undefined} fallback={mailbox.name} />
                <span>{mailbox.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <>
            <CategoryNav openCount={openCount} mailboxSlug={mailboxSlug} variant="sidebar" />
            <ConversationList mailboxSlug={mailboxSlug} />
          </>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

const ConversationListContent = ({ mailboxSlug }: { mailboxSlug: string }) => (
  <div className="flex-1 overflow-hidden flex h-full flex-col">
    <InboxProvider>
      <List variant="desktop" />
    </InboxProvider>
  </div>
);

const ConversationList = dynamic(() => Promise.resolve(ConversationListContent), {
  ssr: false,
});

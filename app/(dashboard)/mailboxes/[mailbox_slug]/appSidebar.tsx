"use client";

import { Inbox, User, Users, UserMinus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar, SidebarContent, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

declare global {
  interface Window {
    __unstable__onBeforeSetActive: () => void;
  }
}

export function AppSidebar({ mailboxSlug }: { mailboxSlug: string }) {
  const pathname = usePathname();
  const { isMobile } = useSidebar();

  const { data: openCount } = api.mailbox.openCount.useQuery({ mailboxSlug });

  return (
    <Sidebar className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border sticky top-0 h-svh">
      <SidebarHeader />
      <SidebarContent className="flex flex-col flex-1 overflow-hidden">
        <div className="h-full flex flex-col gap-2 p-2">
          <Link
            href={`/mailboxes/${mailboxSlug}/mine`}
            className={cn(
              "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent",
              pathname.includes("/mine") && "bg-sidebar-accent",
            )}
          >
            <User className="h-4 w-4" />
            <span>Mine</span>
            {openCount?.mine ? (
              <span className="ml-auto">{openCount.mine}</span>
            ) : null}
          </Link>
          <Link
            href={`/mailboxes/${mailboxSlug}/assigned`}
            className={cn(
              "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent",
              pathname.includes("/assigned") && "bg-sidebar-accent",
            )}
          >
            <Users className="h-4 w-4" />
            <span>Others</span>
            {openCount?.assigned ? (
              <span className="ml-auto">{openCount.assigned}</span>
            ) : null}
          </Link>
          <Link
            href={`/mailboxes/${mailboxSlug}/unassigned`}
            className={cn(
              "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent",
              pathname.includes("/unassigned") && "bg-sidebar-accent",
            )}
          >
            <UserMinus className="h-4 w-4" />
            <span>Up for grabs</span>
            {openCount?.unassigned ? (
              <span className="ml-auto">{openCount.unassigned}</span>
            ) : null}
          </Link>
          <Link
            href={`/mailboxes/${mailboxSlug}/conversations`}
            className={cn(
              "flex h-10 items-center gap-2 px-2 rounded-lg transition-colors",
              "text-sidebar-foreground hover:bg-sidebar-accent",
              pathname.includes("/conversations") && !pathname.includes("/mine") && !pathname.includes("/assigned") && !pathname.includes("/unassigned") && "bg-sidebar-accent",
            )}
          >
            <Inbox className="h-4 w-4" />
            <span>All</span>
          </Link>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// Remove unused components
// const ConversationListContent = ({ mailboxSlug }: { mailboxSlug: string }) => (
//   <div className="flex-1 overflow-hidden flex h-full flex-col">
//     <InboxProvider>
//       <List variant="desktop" />
//     </InboxProvider>
//   </div>
// );

// const ConversationList = dynamic(() => Promise.resolve(ConversationListContent), {
//   ssr: false,
// });


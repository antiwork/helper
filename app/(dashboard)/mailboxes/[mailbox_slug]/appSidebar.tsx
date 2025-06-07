"use client";

import { BarChart, CheckCircle, ChevronDown, Inbox, Settings, Ticket, User, UserMinus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React from "react";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

declare global {
  interface Window {
    __unstable__onBeforeSetActive: () => void;
  }
}

export function AppSidebar({ mailboxSlug }: { mailboxSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useSidebar();
  const { data: mailboxes } = api.mailbox.list.useQuery();
  const { data: openCounts } = api.mailbox.openCount.useQuery({ mailboxSlug });
  const currentMailbox = mailboxes?.find((m) => m.slug === mailboxSlug);

  const navItems = [
    {
      label: "Dashboard",
      icon: BarChart,
      href: `/mailboxes/${mailboxSlug}/dashboard`,
      active: pathname.includes("/dashboard"),
    },
    {
      label: "Settings",
      icon: Settings,
      href: `/mailboxes/${mailboxSlug}/settings`,
      active: pathname.endsWith("/settings"),
    },
  ];

  const conversationItems = [
    {
      label: "Mine",
      icon: User,
      href: `/mailboxes/${mailboxSlug}/mine`,
      active: pathname.includes("/mine"),
      count: openCounts?.mine,
    },
    {
      label: "Assigned",
      icon: Users,
      href: `/mailboxes/${mailboxSlug}/assigned`,
      active: pathname.includes("/assigned"),
      count: openCounts?.assigned,
    },
    {
      label: "Up for grabs",
      icon: Ticket,
      href: `/mailboxes/${mailboxSlug}/up-for-grabs`,
      active: pathname.includes("/up-for-grabs"),
      count: openCounts?.unassigned,
    },
    {
      label: "All",
      icon: Inbox,
      href: `/mailboxes/${mailboxSlug}/all`,
      active: pathname.includes("/all"),
      count: openCounts?.conversations,
    },
  ];

  return (
    <Sidebar
      className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed top-0 h-svh"
      collapsible="icon"
    >
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="sidebar"
              size="sm"
              className="flex items-center gap-2 w-full h-10 px-2 rounded-lg transition-colors hover:bg-sidebar-accent/80 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
            >
              <Avatar src={undefined} fallback={currentMailbox?.name || ""} size="sm" />
              <span className="truncate text-base group-data-[collapsible=icon]:hidden">{currentMailbox?.name}</span>
              <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" className="min-w-[180px]">
            {mailboxes?.map((mailbox) => (
              <DropdownMenuItem
                key={mailbox.slug}
                onClick={() => {
                  const currentView = /\/mailboxes\/[^/]+\/([^/]+)/.exec(pathname)?.[1] || "conversations";
                  router.push(`/mailboxes/${mailbox.slug}/${currentView}`);
                }}
                className="flex items-center gap-2"
              >
                <Avatar src={undefined} fallback={mailbox.name} size="sm" />
                <span className="truncate text-base">{mailbox.name}</span>
                <span className="ml-auto">
                  {mailbox.slug === currentMailbox?.slug && <CheckCircle className="text-foreground w-4 h-4" />}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full">
        <div>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/mailboxes/${mailboxSlug}/mine`} tooltip="Mine">
                  <Link href={`/mailboxes/${mailboxSlug}/mine`}>
                    <User className="size-4" />
                    <span>Mine</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.mine > 0 && <SidebarMenuBadge>{openCounts.mine}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/mailboxes/${mailboxSlug}/assigned`}
                  tooltip="Assigned"
                >
                  <Link href={`/mailboxes/${mailboxSlug}/assigned`}>
                    <Users className="size-4" />
                    <span>Assigned</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.assigned > 0 && <SidebarMenuBadge>{openCounts.assigned}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/mailboxes/${mailboxSlug}/up-for-grabs`}
                  tooltip="Up for grabs"
                >
                  <Link href={`/mailboxes/${mailboxSlug}/up-for-grabs`}>
                    <Ticket className="size-4" />
                    <span>Up for grabs</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.unassigned > 0 && (
                  <SidebarMenuBadge>{openCounts.unassigned}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/mailboxes/${mailboxSlug}/all`} tooltip="All">
                  <Link href={`/mailboxes/${mailboxSlug}/all`}>
                    <Inbox className="size-4" />
                    <span>All</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.conversations > 0 && (
                  <SidebarMenuBadge>{openCounts.conversations}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
        <div className="mt-auto">
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/mailboxes/${mailboxSlug}/dashboard`}
                  tooltip="Dashboard"
                >
                  <Link href={`/mailboxes/${mailboxSlug}/dashboard`}>
                    <BarChart className="size-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/mailboxes/${mailboxSlug}/settings`}
                  tooltip="Settings"
                >
                  <Link href={`/mailboxes/${mailboxSlug}/settings`}>
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <AccountDropdown />
      </SidebarFooter>
    </Sidebar>
  );
}

// Remove the SidebarTrigger component definition

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

"use client";

import { BarChart, ChevronDown, Inbox, Settings, Ticket, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountDropdown } from "@/app/(dashboard)/(mailbox)/accountDropdown";
import { Avatar } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { api } from "@/trpc/react";

declare global {
  interface Window {
    __unstable__onBeforeSetActive: () => void;
  }
}

export function AppSidebar() {
  const pathname = usePathname();
  const { data: mailbox } = api.mailbox.get.useQuery();
  const { data: openCounts } = api.mailbox.openCount.useQuery();

  return (
    <Sidebar
      className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed top-0 h-svh"
      collapsible="icon"
    >
      <SidebarHeader>
        <Avatar src={undefined} fallback={mailbox?.name || ""} size="sm" />
        <span className="truncate text-base group-data-[collapsible=icon]:hidden">{mailbox?.name}</span>
        <ChevronDown className="ml-auto h-4 w-4 group-data-[collapsible=icon]:hidden" />
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full">
        <div>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/mine`}>
                  <Link href="/mine">
                    <User className="size-4" />
                    <span>Mine</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.mine > 0 && <SidebarMenuBadge>{openCounts.mine}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/assigned`}>
                  <Link href="/assigned">
                    <Users className="size-4" />
                    <span>Assigned</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.assigned > 0 && <SidebarMenuBadge>{openCounts.assigned}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/unassigned`}>
                  <Link href="/unassigned">
                    <Ticket className="size-4" />
                    <span>Up for grabs</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.unassigned > 0 && (
                  <SidebarMenuBadge>{openCounts.unassigned}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/all`}>
                  <Link href="/all">
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
                <SidebarMenuButton asChild isActive={pathname === `/dashboard`}>
                  <Link href="/dashboard">
                    <BarChart className="size-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/settings`}>
                  <Link href="/settings">
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

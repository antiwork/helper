"use client";

import {
  BarChart,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Inbox,
  MonitorSmartphone,
  Settings,
  Ticket,
  User,
  UserPlus,
  Users,
  Link as LinkIcon
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { api } from "@/trpc/react";
import SettingsSidebarCollapsible from "./settingsSidebar";

declare global {
  interface Window {
    __unstable__onBeforeSetActive: () => void;
  }
}

const settingsItems = [
  { label: "Knowledge", id: "knowledge", icon: BookOpen },
  { label: "Team", id: "team", icon: Users },
  { label: "Customers", id: "customers", icon: UserPlus },
  { label: "In-App Chat", id: "in-app-chat", icon: MonitorSmartphone },
  { label: "Integrations", id: "integrations", icon: LinkIcon },
  { label: "Preferences", id: "preferences", icon: Settings },
] as const;

export function AppSidebar({ mailboxSlug }: { mailboxSlug: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { data: mailboxes } = api.mailbox.list.useQuery();
  const { data: openCounts } = api.mailbox.openCount.useQuery({ mailboxSlug });
  const currentMailbox = mailboxes?.find((m) => m.slug === mailboxSlug);

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
                    <span className="group-data-[collapsible=icon]:hidden">Mine</span>
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
                    <span className="group-data-[collapsible=icon]:hidden">Assigned</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.assigned > 0 && <SidebarMenuBadge>{openCounts.assigned}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/mailboxes/${mailboxSlug}/unassigned`}
                  tooltip="Up for grabs"
                >
                  <Link href={`/mailboxes/${mailboxSlug}/unassigned`}>
                    <Ticket className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Up for grabs</span>
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
                    <span className="group-data-[collapsible=icon]:hidden">All</span>
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
                    <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <Settings className="size-4" />
                      <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                      <ChevronDown className="ml-auto size-4 transition-transform duration-200 group-data-[state=closed]/collapsible:rotate-[-90deg]" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                </SidebarMenuItem>

                <CollapsibleContent className="transition-all duration-300 ease-in-out data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                  <SidebarMenuSub>
                    {settingsItems.map((item) => (
                      <SidebarMenuSubItem key={item.id}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={pathname === `/mailboxes/gumroad/settings/${item.id}`}
                          className="pl-2"
                        >
                          <Link href={`/mailboxes/gumroad/settings/${item.id}`}>
                            {<item.icon className="size-4" />}
                            <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </Collapsible>
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

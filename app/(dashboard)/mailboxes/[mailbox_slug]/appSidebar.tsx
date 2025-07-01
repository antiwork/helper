"use client";

import {
  BarChart,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  Inbox,
  Link as LinkIcon,
  MessageSquareText,
  MonitorSmartphone,
  Settings as SettingsIcon,
  Ticket,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";
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

const settingsItems = [
  { label: "Knowledge", id: "knowledge", icon: BookOpen },
  { label: "Team", id: "team", icon: Users },
  { label: "Customers", id: "customers", icon: UserPlus },
  { label: "In-App Chat", id: "in-app-chat", icon: MonitorSmartphone },
  { label: "Integrations", id: "integrations", icon: LinkIcon },
  { label: "Preferences", id: "preferences", icon: SettingsIcon },
] as const;

export function AppSidebar({ mailboxSlug }: { mailboxSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const previousAppUrlRef = useRef<string | null>(null);
  const { data: mailboxes } = api.mailbox.list.useQuery();
  const { data: openCounts } = api.mailbox.openCount.useQuery({ mailboxSlug });
  const currentMailbox = mailboxes?.find((m) => m.slug === mailboxSlug);
  const isSettingsPage = pathname.startsWith(`/mailboxes/${mailboxSlug}/settings`);

  return (
    <Sidebar
      className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed top-0 h-svh"
      collapsible="icon"
    >
      <SidebarHeader>
        {isSettingsPage ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                onClick={() => {
                  const fallback = `/mailboxes/${mailboxSlug}/mine`;
                  router.push(previousAppUrlRef.current || fallback);
                }}
                tooltip="Back to app"
              >
                <div className="flex items-center gap-2 h-10">
                  <ChevronLeft className="size-4" />
                  <span className="font-medium group-data-[collapsible=icon]:hidden">Back to app</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
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
        )}
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full">
        {isSettingsPage ? (
          <>
            <SidebarGroup>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/mailboxes/${mailboxSlug}/settings/${item.id}`}
                      tooltip={item.label}
                    >
                      <Link href={`/mailboxes/${mailboxSlug}/settings/${item.id}`}>
                        <item.icon className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          </>
        ) : (
          <>
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
                    {openCounts && openCounts.assigned > 0 && (
                      <SidebarMenuBadge>{openCounts.assigned}</SidebarMenuBadge>
                    )}
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
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/mailboxes/${mailboxSlug}/saved-replies`}
                      tooltip="Saved replies"
                    >
                      <Link href={`/mailboxes/${mailboxSlug}/saved-replies`}>
                        <MessageSquareText className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Saved replies</span>
                      </Link>
                    </SidebarMenuButton>
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
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Settings"
                      onClick={() => {
                        previousAppUrlRef.current = pathname;
                      }}
                    >
                      <Link href={`/mailboxes/${mailboxSlug}/settings/${settingsItems[0].id}`}>
                        <SettingsIcon className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </div>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <AccountDropdown />
      </SidebarFooter>
    </Sidebar>
  );
}

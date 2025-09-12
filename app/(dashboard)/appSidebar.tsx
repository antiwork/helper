"use client";

import {
  BarChart,
  Bookmark,
  BookOpen,
  ChevronLeft,
  Inbox,
  Layers,
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
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { AccountDropdown } from "@/app/(dashboard)/accountDropdown";
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
  useSidebar,
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
  { label: "Common Issues", id: "common-issues", icon: Layers },
  { label: "Customers", id: "customers", icon: UserPlus },
  { label: "In-App Chat", id: "in-app-chat", icon: MonitorSmartphone },
  { label: "Integrations", id: "integrations", icon: LinkIcon },
  { label: "Mailbox", id: "mailbox", icon: Inbox },
  { label: "User preferences", id: "preferences", icon: SettingsIcon },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousAppUrlRef = useRef<string | null>(null);
  const { data: openCounts } = api.mailbox.openCount.useQuery();
  const { data: mailbox } = api.mailbox.get.useQuery();
  const { data: pinnedIssues, error: issueGroupsError } = api.mailbox.issueGroups.pinnedList.useQuery();
  const isSettingsPage = pathname.startsWith(`/settings`);
  const { isMobile, setOpenMobile } = useSidebar();

  const currentIssueGroupId = searchParams.get("issueGroupId");

  const handleItemClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

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
                className="cursor-pointer"
                onClick={() => {
                  const fallback = `/mine`;
                  router.push(previousAppUrlRef.current || fallback);
                  handleItemClick();
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
          <div className="flex items-center gap-2 w-full h-10 px-2 rounded-lg">
            <Avatar src={undefined} fallback={mailbox?.name || "G"} size="sm" />
            <span className="truncate text-base group-data-[collapsible=icon]:hidden">{mailbox?.name}</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full">
        {isSettingsPage ? (
          <>
            <SidebarGroup>
              <SidebarMenu>
                {settingsItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton asChild isActive={pathname === `/settings/${item.id}`} tooltip={item.label}>
                      <Link href={`/settings/${item.id}`} onClick={handleItemClick}>
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
                    <SidebarMenuButton asChild isActive={pathname === `/mine`} tooltip="Mine">
                      <Link href={`/mine`} onClick={handleItemClick}>
                        <User className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Mine</span>
                      </Link>
                    </SidebarMenuButton>
                    {openCounts && openCounts.mine > 0 && <SidebarMenuBadge>{openCounts.mine}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === `/assigned`} tooltip="Assigned">
                      <Link href={`/assigned`} onClick={handleItemClick}>
                        <Users className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Assigned</span>
                      </Link>
                    </SidebarMenuButton>
                    {openCounts && openCounts.assigned > 0 && (
                      <SidebarMenuBadge>{openCounts.assigned}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === `/unassigned`} tooltip="Up for grabs">
                      <Link href={`/unassigned`} onClick={handleItemClick}>
                        <Ticket className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Up for grabs</span>
                      </Link>
                    </SidebarMenuButton>
                    {openCounts && openCounts.unassigned > 0 && (
                      <SidebarMenuBadge>{openCounts.unassigned}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === `/all` && !currentIssueGroupId} tooltip="Open">
                      <Link href={`/all`} onClick={handleItemClick}>
                        <Inbox className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Open</span>
                      </Link>
                    </SidebarMenuButton>
                    {openCounts && openCounts.all > 0 && <SidebarMenuBadge>{openCounts.all}</SidebarMenuBadge>}
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>

              <SidebarGroup>
                <SidebarMenu>
                  {!issueGroupsError && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === `/common-issues`} tooltip="Common issues">
                        <Link href={`/common-issues`} onClick={handleItemClick}>
                          <Layers className="size-4" />
                          <span className="group-data-[collapsible=icon]:hidden">Common issues</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === `/saved-replies`} tooltip="Saved replies">
                      <Link href={`/saved-replies`} onClick={handleItemClick}>
                        <MessageSquareText className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Saved replies</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>

              {!issueGroupsError && pinnedIssues && pinnedIssues.groups.length > 0 && (
                <SidebarGroup>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton className="text-xs font-medium text-sidebar-foreground/50 pointer-events-none">
                        Pinned issues
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    {pinnedIssues.groups.slice(0, 5).map((group) => (
                      <SidebarMenuItem key={group.id}>
                        <SidebarMenuButton
                          asChild
                          tooltip={group.title}
                          isActive={pathname === `/all` && currentIssueGroupId === group.id.toString()}
                        >
                          <Link href={`/all?issueGroupId=${group.id}`} onClick={handleItemClick}>
                            <Bookmark className="size-3" />
                            <span className="group-data-[collapsible=icon]:hidden truncate leading-tight">
                              {group.title.replace(/^\d+\s+/, "").length > 25
                                ? `${group.title.replace(/^\d+\s+/, "").substring(0, 25)}...`
                                : group.title.replace(/^\d+\s+/, "")}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                        {group.openCount > 0 && <SidebarMenuBadge>{group.openCount}</SidebarMenuBadge>}
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroup>
              )}
            </div>
            <div className="mt-auto">
              <SidebarGroup>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === `/stats`} tooltip="Stats">
                      <Link href={`/stats`} onClick={handleItemClick}>
                        <BarChart className="size-4" />
                        <span className="group-data-[collapsible=icon]:hidden">Stats</span>
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
                      <Link href={`/settings/${settingsItems[0].id}`} onClick={handleItemClick}>
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

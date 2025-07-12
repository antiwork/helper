"use client";

import {
  BarChart,
  BookOpen,
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
import { useCallback, useMemo, useRef } from "react";
import { AccountDropdown } from "@/app/(dashboard)/accountDropdown";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
  { label: "Customers", id: "customers", icon: UserPlus },
  { label: "In-App Chat", id: "in-app-chat", icon: MonitorSmartphone },
  { label: "Integrations", id: "integrations", icon: LinkIcon },
  { label: "Preferences", id: "preferences", icon: SettingsIcon },
] as const;

// Memoized navigation item component to prevent unnecessary re-renders
function NavigationItem({ 
  href, 
  icon: Icon, 
  label, 
  isActive, 
  badge, 
  tooltip,
  onClick 
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  badge?: number;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={tooltip}>
        <Link href={href} onClick={onClick}>
          <Icon className="size-4" />
          <span className="group-data-[collapsible=icon]:hidden">{label}</span>
        </Link>
      </SidebarMenuButton>
      {badge && badge > 0 && <SidebarMenuBadge>{badge}</SidebarMenuBadge>}
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const previousAppUrlRef = useRef<string | null>(null);
  const { data: openCounts, isLoading: isCountsLoading } = api.mailbox.openCount.useQuery();
  const { data: mailbox, isLoading: isMailboxLoading } = api.mailbox.get.useQuery();
  const { isMobile, setOpenMobile } = useSidebar();

  const isSettingsPage = useMemo(() => pathname.startsWith(`/settings`), [pathname]);

  const handleItemClick = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const handleBackToApp = useCallback(() => {
    const fallback = `/mine`;
    router.push(previousAppUrlRef.current || fallback);
    handleItemClick();
  }, [router, handleItemClick]);

  const handleSettingsClick = useCallback(() => {
    previousAppUrlRef.current = pathname;
    handleItemClick();
  }, [pathname, handleItemClick]);

  // Memoize navigation items to prevent recreation on each render
  const mainNavigationItems = useMemo(() => [
    {
      href: "/mine",
      icon: User,
      label: "Mine",
      badge: openCounts?.mine,
      tooltip: "Mine",
    },
    {
      href: "/assigned",
      icon: Users,
      label: "Assigned",
      badge: openCounts?.assigned,
      tooltip: "Assigned",
    },
    {
      href: "/unassigned",
      icon: Ticket,
      label: "Up for grabs",
      badge: openCounts?.unassigned,
      tooltip: "Up for grabs",
    },
    {
      href: "/all",
      icon: Inbox,
      label: "All",
      badge: openCounts?.conversations,
      tooltip: "All",
    },
  ], [openCounts]);

  const bottomNavigationItems = useMemo(() => [
    {
      href: "/dashboard",
      icon: BarChart,
      label: "Dashboard",
      tooltip: "Dashboard",
    },
  ], []);

  // Loading skeleton for header to prevent layout shift
  const renderHeader = () => {
    if (isSettingsPage) {
      return (
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="cursor-pointer"
              onClick={handleBackToApp}
              tooltip="Back to app"
            >
              <div className="flex items-center gap-2 h-10">
                <ChevronLeft className="size-4" />
                <span className="font-medium group-data-[collapsible=icon]:hidden">Back to app</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      );
    }

    if (isMailboxLoading) {
      return (
        <div className="flex items-center gap-2 w-full h-10 px-2 rounded-lg">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4 flex-1 group-data-[collapsible=icon]:hidden" />
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 w-full h-10 px-2 rounded-lg">
        <Avatar src={undefined} fallback={mailbox?.name || "G"} size="sm" />
        <span className="truncate text-base group-data-[collapsible=icon]:hidden">{mailbox?.name}</span>
      </div>
    );
  };

  return (
    <Sidebar
      className="bg-sidebar text-sidebar-foreground border-r border-sidebar-border fixed top-0 h-svh"
      collapsible="icon"
    >
      <SidebarHeader>
        {renderHeader()}
      </SidebarHeader>

      <SidebarContent className="flex flex-col h-full">
        {isSettingsPage ? (
          <SidebarGroup>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <NavigationItem
                  key={item.id}
                  href={`/settings/${item.id}`}
                  icon={item.icon}
                  label={item.label}
                  isActive={pathname === `/settings/${item.id}`}
                  tooltip={item.label}
                  onClick={handleItemClick}
                />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ) : (
          <>
            <div>
              <SidebarGroup>
                <SidebarMenu>
                  {mainNavigationItems.map((item) => (
                    <NavigationItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isActive={pathname === item.href}
                      badge={item.badge}
                      tooltip={item.tooltip}
                      onClick={handleItemClick}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroup>
              
              <SidebarGroup>
                <SidebarMenu>
                  <NavigationItem
                    href="/saved-replies"
                    icon={MessageSquareText}
                    label="Saved replies"
                    isActive={pathname === "/saved-replies"}
                    tooltip="Saved replies"
                    onClick={handleItemClick}
                  />
                </SidebarMenu>
              </SidebarGroup>
            </div>
            
            <div className="mt-auto">
              <SidebarGroup>
                <SidebarMenu>
                  {bottomNavigationItems.map((item) => (
                    <NavigationItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      label={item.label}
                      isActive={pathname === item.href}
                      tooltip={item.tooltip}
                      onClick={handleItemClick}
                    />
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip="Settings"
                      onClick={handleSettingsClick}
                    >
                      <Link href={`/settings/${settingsItems[0].id}`}>
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
"use client";

import { BarChart, CheckCircle, ChevronDown, Inbox, Settings, Ticket, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import {
  BookOpen,
  UserPlus,
  MonitorSmartphone,
  Settings as SettingsIcon,
  ChevronRight,
} from "lucide-react";
import { api } from "@/trpc/react";
import SettingsSidebarCollapsible from "./settingsSidebar";
import { useState } from "react";

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
  { label: "Integrations", id: "integrations", icon: Settings }, // Use a valid icon here
  { label: "Preferences", id: "preferences", icon: SettingsIcon },
] as const;

export function AppSidebar({ mailboxSlug }: { mailboxSlug: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
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
                <SidebarMenuButton asChild isActive={pathname === `/mailboxes/${mailboxSlug}/mine`}>
                  <Link href={`/mailboxes/${mailboxSlug}/mine`}>
                    <User className="size-4" />
                    <span>Mine</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.mine > 0 && <SidebarMenuBadge>{openCounts.mine}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/mailboxes/${mailboxSlug}/assigned`}>
                  <Link href={`/mailboxes/${mailboxSlug}/assigned`}>
                    <Users className="size-4" />
                    <span>Assigned</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.assigned > 0 && <SidebarMenuBadge>{openCounts.assigned}</SidebarMenuBadge>}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/mailboxes/${mailboxSlug}/unassigned`}>
                  <Link href={`/mailboxes/${mailboxSlug}/unassigned`}>
                    <Ticket className="size-4" />
                    <span>Up for grabs</span>
                  </Link>
                </SidebarMenuButton>
                {openCounts && openCounts.unassigned > 0 && (
                  <SidebarMenuBadge>{openCounts.unassigned}</SidebarMenuBadge>
                )}
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === `/mailboxes/${mailboxSlug}/all`}>
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
                <SidebarMenuButton asChild isActive={pathname === `/mailboxes/${mailboxSlug}/dashboard`}>
                  <Link href={`/mailboxes/${mailboxSlug}/dashboard`}>
                    <BarChart className="size-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === `/mailboxes/${mailboxSlug}/settings`}
                  tooltip="Settings"
                >
                  <Link href={`/mailboxes/${mailboxSlug}/settings`}>
                    <Settings className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              <SidebarGroup>
                <SidebarMenu>
                  <Collapsible open={open} onOpenChange={setOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton>
                          <SettingsIcon className="size-4" />
                          <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                          {open ? (
                            <ChevronDown className="ml-auto h-4 w-4" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4" />
                          )}
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                    </SidebarMenuItem>
          
                    <CollapsibleContent asChild>
                      <div className="ml-4 mt-1 space-y-1">
                        {settingsItems.map((item) => (
                          <SidebarMenuItem key={item.id}>
                            <SidebarMenuButton
                              asChild
                              isActive={pathname === `/mailboxes/gumroad/settings/${item.id}`}
                              className="pl-2"
                            >
                              <Link href={`/mailboxes/gumroad/settings/${item.id}`}>
                                {<item.icon className="size-4" />}
                                <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroup>
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

"use client";

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Link,
  MonitorSmartphone,
  Settings as SettingsIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { parseAsStringEnum, useQueryState } from "nuqs";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarGroup, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const settingsItems = [
  { label: "Knowledge", id: "knowledge", icon: BookOpen },
  { label: "Team", id: "team", icon: Users },
  { label: "Customers", id: "customers", icon: UserPlus },
  { label: "In-App Chat", id: "in-app-chat", icon: MonitorSmartphone },
  { label: "Integrations", id: "integrations", icon: Link },
  { label: "Preferences", id: "preferences", icon: SettingsIcon },
] as const;

export default function SettingsSidebarCollapsible() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  return (
    <SidebarGroup>
      <SidebarMenu>
        <Collapsible open={open} onOpenChange={setOpen}>
          <SidebarMenuItem>
            <CollapsibleTrigger asChild>
              <SidebarMenuButton>
                <SettingsIcon className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                {open ? <ChevronDown className="ml-auto h-4 w-4" /> : <ChevronRight className="ml-auto h-4 w-4" />}
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
                      <item.icon className="size-4" />
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
  );
}

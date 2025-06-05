"use client";

import { BarChart, CheckCircle, Inbox, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

export function NavigationRail({ mailboxSlug }: { mailboxSlug: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: mailboxes } = api.mailbox.list.useQuery();
  const currentMailbox = mailboxes?.find((m) => m.slug === mailboxSlug);

  const navItems = [
    {
      label: "Inbox",
      icon: Inbox,
      href: `/mailboxes/${mailboxSlug}/conversations`,
      active: !pathname.includes("/search") && !pathname.includes("/dashboard") && !pathname.endsWith("/settings"),
    },
    {
      label: "Search",
      icon: Search,
      href: `/mailboxes/${mailboxSlug}/search`,
      active: pathname.includes("/search"),
    },
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

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className="fixed top-0 left-0 h-svh w-14 flex flex-col items-center bg-sidebar border-r border-sidebar-border py-2 gap-2"
        style={{ minWidth: 56 }}
      >
        <div className="flex flex-col gap-2 flex-1 items-center">
          <Tooltip delayDuration={0}>
            <DropdownMenu>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="sidebar"
                    size="sm"
                    className="flex flex-col items-center w-10 h-10 p-0 rounded-full transition-colors hover:bg-sidebar-accent/80"
                    iconOnly
                    aria-label="Switch mailbox"
                  >
                    <Avatar src={undefined} fallback={currentMailbox?.name || ""} size="sm" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <DropdownMenuContent side="right" align="start" className="min-w-[180px]">
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
            <TooltipContent side="right" align="center">
              {currentMailbox?.name}
            </TooltipContent>
          </Tooltip>
          {navItems.map((item) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant={item.active ? "sidebar-subtle" : "sidebar"}
                  size="sm"
                  iconOnly
                  aria-label={item.label}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-full transition-colors",
                    item.active
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "hover:bg-sidebar-accent/80 text-sidebar-foreground/60 hover:text-sidebar-foreground",
                  )}
                >
                  <Link href={item.href} prefetch={false}>
                    <item.icon className="w-5 h-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="mt-auto mb-2">
          <AccountDropdown />
        </div>
      </nav>
    </TooltipProvider>
  );
}

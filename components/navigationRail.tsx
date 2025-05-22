"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart, Inbox, Search, Settings, ChevronsUpDown, CheckCircle } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AccountDropdown } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/accountDropdown";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export function NavigationRail() {
  const pathname = usePathname();
  const router = useRouter();
  const [mailboxSlug, setMailboxSlug] = useState<string | null>(null);
  const { data: mailboxes } = api.mailbox.list.useQuery();
  const currentMailbox = mailboxSlug
    ? mailboxes?.find((m) => m.slug === mailboxSlug)
    : mailboxes?.[0];

  useEffect(() => {
    if (!mailboxSlug && mailboxes && mailboxes.length > 0) {
      setMailboxSlug(mailboxes[0]?.slug || "");
    }
  }, [mailboxes, mailboxSlug]);

  useEffect(() => {
    // Try to extract mailbox slug from the path
    const match = pathname.match(/\/mailboxes\/([^/]+)/);
    if (match && match[1]) setMailboxSlug(match[1]);
  }, [pathname]);

  const navItems = [
    {
      label: "Inbox",
      icon: Inbox,
      href: mailboxSlug ? `/mailboxes/${mailboxSlug}/conversations` : "#",
      active: pathname.includes("/conversations"),
    },
    {
      label: "Search",
      icon: Search,
      href: mailboxSlug ? `/mailboxes/${mailboxSlug}/search` : "#",
      active: pathname.includes("/search"),
    },
    {
      label: "Dashboard",
      icon: BarChart,
      href: mailboxSlug ? `/mailboxes/${mailboxSlug}/dashboard` : "#",
      active: pathname.includes("/dashboard"),
    },
    {
      label: "Settings",
      icon: Settings,
      href: mailboxSlug ? `/mailboxes/${mailboxSlug}/settings` : "#",
      active: pathname.endsWith("/settings"),
    },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        className="h-svh w-14 flex flex-col items-center bg-sidebar border-r border-sidebar-border py-2 gap-2"
        style={{ minWidth: 56 }}
      >
        <div className="flex flex-col gap-2 flex-1 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="sidebar"
                size="sm"
                className="flex flex-col items-center w-10 h-10 p-0 rounded-full transition-colors hover:bg-sidebar-accent/80"
                iconOnly
                aria-label="Switch mailbox"
              >
                <Avatar src={undefined} fallback={currentMailbox?.name || "?"} size="sm" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="min-w-[180px]">
              {mailboxes?.map((mailbox) => (
                <DropdownMenuItem
                  key={mailbox.slug}
                  onClick={() => {
                    setMailboxSlug(mailbox.slug || "");
                    router.push(`/mailboxes/${mailbox.slug}/conversations`);
                  }}
                  className="flex items-center gap-2"
                >
                  <Avatar src={undefined} fallback={mailbox.name} size="sm" />
                  <span className="truncate text-base">{mailbox.name}</span>
                  <span className="ml-auto">{mailbox.slug === currentMailbox?.slug && <CheckCircle className="text-foreground w-4 h-4" />}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
                      : "hover:bg-sidebar-accent/80 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                  )}
                >
                  <Link href={item.href} prefetch={false}>
                    <item.icon className="w-5 h-5" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="mt-auto mb-2">
          <AccountDropdown
            trigger={(children) => (
              <Button
                variant="sidebar"
                size="sm"
                iconOnly
                className="w-10 h-10 flex items-center justify-center rounded-full transition-colors hover:bg-sidebar-accent/80"
                aria-label="Account menu"
              >
                {children}
              </Button>
            )}
          />
        </div>
      </nav>
    </TooltipProvider>
  );
}

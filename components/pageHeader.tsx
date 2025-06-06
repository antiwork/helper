"use client";

import { ArrowLeft, Menu } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { AppSidebarOpen } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebarOpen";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "./ui/button";
import { useSidebar } from "@/components/ui/sidebar";

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
};

export function PageHeader({ title, children }: PageHeaderProps) {
  const params = useParams<{ mailbox_slug: string }>();
  const pathname = usePathname();
  const mailboxSlug = params.mailbox_slug;
  const isSettings = pathname.endsWith("/settings");
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            className="md:hidden p-2"
            onClick={() => setOpenMobile(true)}
            aria-label="Open sidebar"
            type="button"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

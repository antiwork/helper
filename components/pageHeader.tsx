"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { AppSidebarOpen } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/appSidebarOpen";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "./ui/button";

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

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border px-4">
      <div className="flex items-center gap-4">
        <h1 className="text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

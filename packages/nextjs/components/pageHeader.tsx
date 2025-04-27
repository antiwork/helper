"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { AppSidebarOpen } from "@/app/(dashboard)/mailboxes/[mailbox_slug]/_components/appSidebarOpen";
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
        {isSettings ? (
          <>
            {isMobile ? (
              <AppSidebarOpen mailboxSlug={mailboxSlug} />
            ) : (
              <>
                <Button variant="ghost" iconOnly>
                  <Link href={`/mailboxes/${mailboxSlug}/conversations`}>
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </Button>
                <Avatar src={undefined} fallback={mailboxSlug.toUpperCase().slice(0, 2)} size="sm" />
              </>
            )}
          </>
        ) : (
          <AppSidebarOpen mailboxSlug={mailboxSlug} />
        )}
        <h1 className="text-lg">{title}</h1>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

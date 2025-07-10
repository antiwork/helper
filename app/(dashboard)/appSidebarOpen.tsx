"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";
import { api } from "@/trpc/react";

export function AppSidebarOpen() {
  const { setOpenMobile } = useSidebar();
  const { data: mailbox } = api.mailbox.get.useQuery();

  return (
    <Link
      href="#"
      className="md:hidden"
      onClick={(e) => {
        e.preventDefault();
        setOpenMobile(true);
      }}
    >
      <Avatar src={undefined} fallback={mailbox?.name?.[0]?.toUpperCase() || "G"} />
      <span className="sr-only">Toggle Sidebar</span>
    </Link>
  );
}

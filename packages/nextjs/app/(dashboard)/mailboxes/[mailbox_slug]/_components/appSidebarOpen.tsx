"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";

type Props = {
  mailboxSlug: string;
};

export function AppSidebarOpen({ mailboxSlug }: Props) {
  const { setOpenMobile } = useSidebar();

  return (
    <Link
      href="#"
      className="md:hidden"
      onClick={(e) => {
        e.preventDefault();
        setOpenMobile(true);
      }}
    >
      <Avatar src={undefined} fallback={mailboxSlug.toUpperCase().slice(0, 2)} />
      <span className="sr-only">Toggle Sidebar</span>
    </Link>
  );
}

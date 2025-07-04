"use client";

import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { useSidebar } from "@/components/ui/sidebar";

type Props = {};

export function AppSidebarOpen({}: Props) {
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
      <Avatar src={undefined} fallback={"MB"} />
      <span className="sr-only">Toggle Sidebar</span>
    </Link>
  );
}

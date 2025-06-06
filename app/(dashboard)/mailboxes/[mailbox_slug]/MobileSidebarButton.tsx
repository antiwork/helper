"use client";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function MobileSidebarButton() {
  const { setOpenMobile } = useSidebar();
  return (
    <button
      className="md:hidden p-2 m-2"
      onClick={() => setOpenMobile(true)}
      aria-label="Open sidebar"
      type="button"
    >
      <Menu className="w-6 h-6" />
    </button>
  );
} 
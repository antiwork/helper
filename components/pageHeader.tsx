"use client";

import { Menu } from "lucide-react";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  children?: React.ReactNode;
  variant?: "default" | "mahogany";
};

export function PageHeader({ title, children, variant = "default" }: PageHeaderProps) {
  const isMobile = useIsMobile();
  const { setOpenMobile } = useSidebar();

  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center justify-between gap-4 border-b sm:px-6 px-4",
        variant === "mahogany" ? "bg-sidebar text-sidebar-foreground border-sidebar" : "border-border",
      )}
    >
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {isMobile && (
          <button className="md:hidden p-2" onClick={() => setOpenMobile(true)} aria-label="Open sidebar" type="button">
            <Menu className="w-6 h-6" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

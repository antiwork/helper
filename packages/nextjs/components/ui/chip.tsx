"use client";

import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";

export type ChipVariant = "sidebar" | "mobile";

type ChipProps = {
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  count?: number;
  href: string;
  isActive?: boolean;
  variant?: ChipVariant;
  className?: string;
};

const chipStyles = {
  sidebar: {
    base: "bg-sidebar-accent text-sidebar-foreground hover:bg-sidebar-accent/80",
    active: "bg-bright text-primary dark:text-sidebar",
    icon: "text-sidebar-foreground",
    count: "bg-sidebar text-bright",
  },
  mobile: {
    base: "bg-primary/90 text-primary-foreground dark:text-primary dark:bg-sidebar-accent",
    active: "bg-bright text-primary dark:text-sidebar",
    icon: "text-primary-foreground dark:text-primary",
    count: "bg-primary dark:bg-primary-foreground text-bright",
  },
} as const;

export const Chip = React.forwardRef<HTMLAnchorElement, ChipProps>(
  ({ label, icon: Icon, count, href, isActive, variant = "sidebar", className }, ref) => {
    const styles = chipStyles[variant];

    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          "flex items-center gap-2 px-2 py-1.5 rounded-full whitespace-nowrap transition-colors",
          isActive ? styles.active : styles.base,
          className,
        )}
      >
        {Icon && <Icon className={cn("h-4 w-4 ml-1", isActive ? "text-primary dark:text-sidebar" : styles.icon)} />}
        <span className={cn("text-sm mr-1", isActive ? "font-sundry-medium" : "font-normal")}>{label}</span>
        {typeof count === "number" && count > 0 && (
          <span
            className={cn(
              "text-sm px-1.5 py-0.5 rounded-full min-w-[1.5rem] text-center",
              isActive ? styles.count : styles.count,
            )}
          >
            {count.toLocaleString()}
          </span>
        )}
      </Link>
    );
  },
);
Chip.displayName = "Chip";

export const ChipContainer = ({
  className,
  storageKey = "chipContainerScroll",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { storageKey?: string }) => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      sessionStorage.setItem(storageKey, container.scrollLeft.toString());
    };

    const savedScroll = sessionStorage.getItem(storageKey);
    if (savedScroll) {
      container.scrollLeft = parseInt(savedScroll);
    }

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [storageKey]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex gap-1.5 overflow-x-auto px-4 py-2 md:pb-4",
        "[scrollbar-color:var(--scrollbar-color,rgba(0,0,0,0.4))_transparent]",
        "[&::-webkit-scrollbar]{height:4px}",
        "[&::-webkit-scrollbar-thumb]{background:rgba(0,0,0,0.4)}",
        "dark:[&::-webkit-scrollbar-thumb]{background:rgba(255,255,255,0.4)}",
        "dark:[--scrollbar-color:rgba(255,255,255,0.4)]",
        className,
      )}
      {...props}
    />
  );
};
ChipContainer.displayName = "ChipContainer";

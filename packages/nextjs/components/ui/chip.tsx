"use client";

import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react"

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
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { storageKey?: string }) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [showLeft, setShowLeft] = React.useState(false)
  const [showRight, setShowRight] = React.useState(false)

  const checkScroll = () => {
    const el = containerRef.current
    if (!el) return
    setShowLeft(el.scrollLeft > 0)
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handleScroll = () => {
      sessionStorage.setItem(storageKey, el.scrollLeft.toString())
      checkScroll()
    }
    const savedScroll = sessionStorage.getItem(storageKey)
    if (savedScroll) el.scrollLeft = parseInt(savedScroll)
    el.addEventListener("scroll", handleScroll)
    checkScroll()
    return () => el.removeEventListener("scroll", handleScroll)
  }, [storageKey])

  const scrollBy = (amount: number) => {
    containerRef.current?.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
    <div className="relative">
      {showLeft && (
        <>
          <div className="absolute left-0 top-0 h-full w-14 pointer-events-none bg-gradient-to-r from-sidebar via-sidebar via-[40%] to-transparent z-10" />
          <button
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full h-8 w-8 bg-bright text-primary dark:text-sidebar transition-colors shadow leading-normal ml-2"
            onClick={() => scrollBy(-120)}
            tabIndex={-1}
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </>
      )}
      <div
        ref={containerRef}
        className={cn(
          "flex gap-1.5 overflow-x-auto px-4 py-4",
          "[scrollbar-color:var(--scrollbar-color,rgba(0,0,0,0.4))_transparent]",
          "[&::-webkit-scrollbar]{height:4px}",
          "[&::-webkit-scrollbar-thumb]{background:rgba(0,0,0,0.4)}",
          "dark:[&::-webkit-scrollbar-thumb]{background:rgba(255,255,255,0.4)}",
          "dark:[--scrollbar-color:rgba(255,255,255,0.4)]",
          className
        )}
        {...props}
      >
        {children}
      </div>
      {showRight && (
        <>
          <div className="absolute right-0 top-0 h-full w-14 pointer-events-none bg-gradient-to-l from-sidebar via-sidebar via-[40%] to-transparent z-10" />
          <button
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full h-8 w-8 bg-bright text-primary dark:text-sidebar transition-colors shadow leading-normal mr-2"
            onClick={() => scrollBy(120)}
            tabIndex={-1}
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  )
}
ChipContainer.displayName = "ChipContainer"

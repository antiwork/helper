"use client";

import { BookOpen } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MarketingHeaderProps = {
  bgColor?: string;
};

export function MarketingHeader({ bgColor = "#3D0C11" }: MarketingHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <header
        className={cn("fixed top-0 z-50 pb-2 w-full transition-all duration-300", isScrolled ? "pt-2" : "pt-4")}
        style={{ backgroundColor: bgColor }}
      >
        <div className="container mx-auto px-4 py-2 flex items-center justify-center">
          <Link href="/" className="flex items-center">
            <Image src="/logo-white.svg" alt="Helper" width={120} height={32} />
          </Link>
        </div>
      </header>
    </TooltipProvider>
  );
}

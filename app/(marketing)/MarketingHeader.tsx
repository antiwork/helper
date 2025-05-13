"use client";

import { useUser } from "@clerk/nextjs";
import { Menu, BookOpen, Inbox } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type MarketingHeaderProps = {
  bgColor?: string;
};

export function MarketingHeader({ bgColor = "#3D0C11" }: MarketingHeaderProps) {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [githubStars, setGithubStars] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    fetch("https://api.github.com/repos/antiwork/helper")
      .then((res) => res.json())
      .then((data) => {
        setGithubStars(data.stargazers_count || 0);
      })
      .catch(() => {});
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header
      className={`w-full transition-all duration-300 ${isScrolled ? "py-2 shadow-md" : "py-4"}`}
      style={{ backgroundColor: isScrolled ? "#2B0808" : bgColor }}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo-white.svg" alt="Helper" width={120} height={32} />
        </Link>
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="https://github.com/antiwork/helper" target="_blank" rel="noopener noreferrer" className="flex items-center group">
            <span className="inline-flex items-center justify-center w-9 h-9">
              <span dangerouslySetInnerHTML={{ __html: `<svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.8 24 17.302 24 12c0-6.627-5.373-12-12-12z\" fill=\"#fff\"/></svg>` }} />
            </span>
          </Link>
          <Link href="/docs" target="_blank" rel="noopener noreferrer" className="flex items-center group">
            <span className="inline-flex items-center justify-center w-9 h-9 transition-colors duration-200 group-hover:text-amber-400 group-focus:text-amber-400">
              <BookOpen className="h-6 w-6" />
            </span>
          </Link>
          {isSignedIn ? (
            <Link href="/mailboxes" className="flex items-center group">
              <span className="inline-flex items-center justify-center w-9 h-9 transition-colors duration-200 group-hover:text-amber-400 group-focus:text-amber-400">
                <Inbox className="h-6 w-6" />
              </span>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="bright" size="sm" className="text-black">
                Get started
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

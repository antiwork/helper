"use client";

import { useUser } from "@clerk/nextjs";
import { Menu } from "lucide-react";
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

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header
      className={`w-full transition-all duration-300 ${
        isScrolled ? "py-2 shadow-md" : "py-4"
      }`}
      style={{ backgroundColor: isScrolled ? "#2B0808" : bgColor }}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image src="/logo.svg" alt="Helper" width={120} height={32} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link
            href="/features"
            className={`text-sm font-medium transition-colors ${
              pathname === "/features" ? "text-amber-400" : "text-white hover:text-amber-300"
            }`}
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className={`text-sm font-medium transition-colors ${
              pathname === "/pricing" ? "text-amber-400" : "text-white hover:text-amber-300"
            }`}
          >
            Pricing
          </Link>
          <Link
            href="/help"
            className={`text-sm font-medium transition-colors ${
              pathname === "/help" ? "text-amber-400" : "text-white hover:text-amber-300"
            }`}
          >
            Help
          </Link>
          {isSignedIn ? (
            <Link href="/dashboard">
              <Button variant="bright" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <div className="flex items-center space-x-4">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-white hover:text-amber-300">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="bright" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </nav>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-white" onClick={toggleMobileMenu}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#2B0808] py-4">
          <div className="container mx-auto px-4 flex flex-col space-y-4">
            <Link
              href="/features"
              className={`text-sm font-medium transition-colors ${
                pathname === "/features" ? "text-amber-400" : "text-white hover:text-amber-300"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Features
            </Link>
            <Link
              href="/pricing"
              className={`text-sm font-medium transition-colors ${
                pathname === "/pricing" ? "text-amber-400" : "text-white hover:text-amber-300"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link
              href="/help"
              className={`text-sm font-medium transition-colors ${
                pathname === "/help" ? "text-amber-400" : "text-white hover:text-amber-300"
              }`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Help
            </Link>
            {isSignedIn ? (
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="bright" size="sm" className="w-full">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <div className="flex flex-col space-y-2">
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full text-white hover:text-amber-300">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="bright" size="sm" className="w-full">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

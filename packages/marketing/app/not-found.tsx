"use client";

import { ArrowLeft, Home, Shuffle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const [footerBgColor, setFooterBgColor] = useState("#000000");
  const [footerTextColor, setFooterTextColor] = useState("#FFFFFF");
  const [mounted, setMounted] = useState(false);

  const generateRandomColors = useCallback(() => {
    const generateRandomColor = () =>
      `#${Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")}`;

    const getContrastRatio = (color1: string, color2: string) => {
      const luminance = (color: string) => {
        const rgb = parseInt(color.slice(1), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const l1 = luminance(color1);
      const l2 = luminance(color2);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };

    let bgColor, textColor;
    do {
      bgColor = generateRandomColor();
      textColor = generateRandomColor();
    } while (getContrastRatio(bgColor, textColor) < 4.5);

    setFooterBgColor(bgColor);
    setFooterTextColor(textColor);
  }, []);

  useEffect(() => {
    setMounted(true);

    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();
    window.addEventListener("resize", setVH);

    return () => window.removeEventListener("resize", setVH);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="h-screen w-full flex flex-col bg-[#3D0C11] dark:bg-background overflow-hidden">
      <header className="w-full bg-[#3D0C11]/80 dark:bg-background/80 backdrop-blur-sm border-b border-white/10 dark:border-border">
        <nav className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center transition-transform hover:scale-105">
              <Image src="/logo-white.svg" priority alt="Helper" width={120} height={32} />
            </Link>
          </div>
        </nav>
      </header>
      <main className="flex-1 w-full flex items-center justify-center px-4 py-4 min-h-0">
        <div className="w-full max-w-2xl mx-auto text-center">
          <div className="relative mb-4">
            <div className="text-[6rem] sm:text-[8rem] md:text-[10rem] lg:text-[12rem] xl:text-[14rem] font-black text-white/10 dark:text-foreground/10 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <Image
                  src="/logo_icon.svg"
                  alt="Helper"
                  width={60}
                  height={60}
                  className="sm:w-[70px] sm:h-[70px] md:w-[80px] md:h-[80px] lg:w-[90px] lg:h-[90px] xl:w-[100px] xl:h-[100px] animate-pulse opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white dark:text-foreground">
              Page Not Found
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-white/80 dark:text-muted-foreground max-w-md mx-auto leading-relaxed">
              The page you're looking for seems to have wandered off. Let's get you back on track.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
            <Link href="/">
              <Button className="bg-bright hover:bg-bright/90 text-bright-foreground font-semibold px-6 py-2.5 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl">
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </Button>
            </Link>
            <Button
              variant="outlined"
              onClick={() => window.history.back()}
              className="border-white/20 dark:border-border text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted px-6 py-2.5"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 dark:bg-muted/30 backdrop-blur-sm border border-white/10 dark:border-border">
            <h3 className="text-sm md:text-base font-semibold text-white dark:text-foreground mb-2">Need help?</h3>
            <p className="text-white/70 dark:text-muted-foreground mb-3 text-xs md:text-sm">
              If you think this is an error, please contact our support team.
            </p>
            <Link href="/docs">
              <Button variant="ghost" size="sm" className="text-bright hover:text-bright/80 hover:bg-bright/10">
                Visit Documentation
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <footer
        className="w-full h-14 sm:h-16 px-4 transition-all duration-500 ease-in-out border-t border-white/10 dark:border-border"
        style={{ backgroundColor: footerBgColor }}
      >
        <div className="container mx-auto h-full flex items-center justify-between">
          <div className="flex items-center">
            <a
              href="https://helper.ai/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-transform hover:scale-105"
            >
              <Image
                src="/logo.svg"
                alt="Helper"
                width={80}
                height={24}
                className="sm:w-[100px] sm:h-[32px] opacity-90 hover:opacity-100 transition-opacity"
                style={{ filter: `brightness(0) saturate(100%) invert(1)` }}
              />
            </a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs sm:text-sm opacity-70 hidden sm:block" style={{ color: footerTextColor }}>
              Feeling colorful?
            </span>
            <Button
              onClick={generateRandomColors}
              size="sm"
              className="transition-all duration-300 hover:scale-110 rounded-full shadow-lg w-8 h-8 sm:w-9 sm:h-9"
              style={{
                backgroundColor: footerTextColor,
                color: footerBgColor,
                border: `2px solid ${footerTextColor}20`,
              }}
            >
              <Shuffle className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse"></div>
        </div>
      </footer>
    </div>
  );
}
